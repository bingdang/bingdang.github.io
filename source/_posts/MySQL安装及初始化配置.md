---
title: MySQL安装及初始化配置
author: 饼铛
tags:
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: a7fae6f0
date: 2019-04-07 15:20:00
---
## 安装
### 解压软件
```bash
[root@db02 /server/tools]# yum  install  -y  ncurses-devel libaio-devel #安装依赖
[root@db02 /server/tools]# mkdir /application/  #规范安装目录
[root@db02 /server/tools]# ll
总用量 629756
-rw-r--r-- 1 root root 644869837 11月 28 11:51 mysql-5.7.26-linux-glibc2.12-x86_64.tar.gz
[root@db02 /server/tools]# tar -xf mysql-5.7.26-linux-glibc2.12-x86_64.tar.gz  -C /application/
```
<!-- more -->
### 处理mariadb
```bash
[root@db02 ~]# rpm -qa |grep mariadb
mariadb-libs-5.5.60-1.el7_5.x86_64  #mariadb的配置文件(/etc/my.cnf)会影响刚才安装的mysql的初始化操作
rpm -e --nodeps mariadb-libs #忽略依赖并卸载，或者yum卸载会一并移除postfix软件
```
### 创建用户
```bash
[root@db02 /server/tools]# cd /application/
[root@db02 /application]# ln -s mysql-5.7.26-linux-glibc2.12-x86_64/ mysql
[root@db02 /application]# ll
lrwxrwxrwx 1 root root  36 12月 16 22:45 mysql -> mysql-5.7.26-linux-glibc2.12-x86_64/
drwxr-xr-x 9 root root 129 12月 16 22:42 mysql-5.7.26-linux-glibc2.12-x86_64
[root@db02 /application]# useradd mysql -s /sbin/nologin -M
```
### 设置环境变量
```bash
[root@db02 /application]# echo "export PATH=/application/mysql/bin:$PATH" >>/etc/bashrc
[root@db02 /application]# . /etc/bashrc
[root@db02 /application]# mysql -V
mysql  Ver 14.14 Distrib 5.7.26, for linux-glibc2.12 (x86_64) using  EditLine wrapper
```

### 创建数据目录并授权（生产环境拿新磁盘，和系统盘独立开来）
**姿势**：<br>
```bash
cd /sys/class/scsi_host/ 
echo "- - -" > host0/scan  #接口扫描
fdisk -l  #不重启发现新磁盘
```
#### 添加一块数据盘
![fdisk](/images/img-2.png)
#### 格式化数据盘
```bash
[root@db02 ~]# fdisk /dev/sdb
欢迎使用 fdisk (util-linux 2.23.2)。

更改将停留在内存中，直到您决定将更改写入磁盘。
使用写入命令前请三思。

Device does not contain a recognized partition table
使用磁盘标识符 0xd6bae412 创建新的 DOS 磁盘标签。

命令(输入 m 获取帮助)：n   #新建分区
Partition type:
   p   primary (0 primary, 0 extended, 4 free)
   e   extended
Select (default p): p  #选择主分区
分区号 (1-4，默认 1)：
起始 扇区 (2048-10485759，默认为 2048)：
将使用默认值 2048
Last 扇区, +扇区 or +size{K,M,G} (2048-10485759，默认为 10485759)：
将使用默认值 10485759
分区 1 已设置为 Linux 类型，大小设为 5 GiB

命令(输入 m 获取帮助)：w  #写入分区表
The partition table has been altered!

Calling ioctl() to re-read partition table.
正在同步磁盘。
[root@db02 ~]# mkfs.xfs /dev/sdb1
```
#### 挂载
```bash
[root@db02 ~]# mkdir /data
[root@db02 ~]# blkid
/dev/sdb1: UUID="3d7298e5-a1fd-4104-9d9d-2fba28f277cc" TYPE="xfs" 
```
![mount](/images/img-4.png)
```bash
[root@db02 ~]# mount -a
[root@db02 ~]# df -Th
文件系统       类型      容量  已用  可用 已用% 挂载点
/dev/sdb1      xfs       5.0G   33M  5.0G    1% /data
[root@db02 /application]# mkdir /data/mysql/data -p  <==数据存放目录
```
#### 授权目录
```bash
[root@db02 /application]# chown -R  mysql:mysql /application/mysql*
[root@db02 /application]# chown -R  mysql:mysql /data/
```
## 初始化数据（创建mysql系统数据）

**\# 5.6 版本 初始化命令  /application/mysql/scripts/mysql_install_db**
**\# 5.7 版本**
### 方法1：
```bash
[root@db02 /application]# mysqld --initialize --user=mysql --basedir=/application/mysql --datadir=/data/mysql/data
```
#### 说明：
**\--initialize 参数：**
```bash
1. 对于密码复杂度进行定制：12位，4种 
2. 密码过期时间：180
3. 给root@localhost用户设置临时密码
```

#### 报错:
```bash
mysqld: error while loading shared libraries: libaio.so.1: cannot open shared object file: No such file or directory
```
#### 解决：
```bash
[root@db01 ~]# yum install -y libaio-devel
```

#### 结果：
```
2019-12-16T15:37:25.272146Z 1 [Note] A temporary password is generated for root@localhost: AwaiCPhhi1&Z  <==自动设置密码
```

### 方法2（生产环境使用）：
**\--initialize-insecure 参数：**
```bash
无限制，无临时密码
```
#### 清除方法1生成的初始化文件：
```bash
\rm -rf /data/mysql/data/*
[root@db02 /application]#  mysqld --initialize-insecure --user=mysql --basedir=/application/mysql --datadir=/data/mysql/data  #重新执行初始化
```
#### 结果：
```bash
2019-12-16T16:00:18.247724Z 1 [Warning] root@localhost is created with an empty password ! Please consider switching off the --initialize-insecure option
```
## 启动数据库
### 编辑配置文件
```bash
[root@db02 /application]# cat >/etc/my.cnf <<'EOF'
[mysqld]
user=mysql
basedir=/application/mysql #mysql安装目录
datadir=/data/mysql/data #mysql系统目录
socket=/tmp/mysql.sock #sock文件目录
server_id=6
port=3306 #端口号
[mysql]
socket=/tmp/mysql.sock
EOF
```
## 启动脚本
### mysql自带启动脚本(C6)：
```bash
[root@db02 /application]# cd /application/mysql/support-files/
[root@db02 /application/mysql/support-files]# ll
总用量 24
-rw-r--r-- 1 mysql mysql   773 4月  13 2019 magic
-rwxr-xr-x 1 mysql mysql  1061 4月  13 2019 mysqld_multi.server
-rwxr-xr-x 1 mysql mysql   894 4月  13 2019 mysql-log-rotate
-rwxr-xr-x 1 mysql mysql 10576 4月  13 2019 mysql.server
```
#### 启动命令：
```bash
[root@db02 /application/mysql/support-files]# ./mysql.server start
Starting MySQL.Logging to '/data/mysql/data/db02.err'.
. SUCCESS! 
[root@db02 /application/mysql/support-files]# ./mysql.server stop
Shutting down MySQL.. SUCCESS! 
[root@db02 /application/mysql/support-files]# ./mysql.server restart
 ERROR! MySQL server PID file could not be found!
Starting MySQL. SUCCESS! 
[root@db02 /application/mysql/support-files]# ./mysql.server status
 SUCCESS! MySQL running (1526)
```
#### sys-v方式启动：
```bash
[root@db02 /etc/init.d]# cp /application/mysql/support-files/mysql.server /etc/init.d/mysqld
[root@db02 /etc/init.d]# service mysqld restart
Shutting down MySQL.. SUCCESS! 
Starting MySQL. SUCCESS! 
```
### systemd启动（C7）
```bash
systemd方式启动：
[root@db02 ~]# service mysqld stop  <==停止mysql服务器
Shutting down MySQL.. SUCCESS!
cat >/etc/systemd/system/mysqld.service <<EOF   <==编辑systemd启动脚本
[Unit]
Description=MySQL Server
Documentation=man:mysqld(8)
Documentation=http://dev.mysql.com/doc/refman/en/using-systemd.html
After=network.target
After=syslog.target
[Install]
WantedBy=multi-user.target
[Service]
User=mysql
Group=mysql
ExecStart=/application/mysql/bin/mysqld --defaults-file=/etc/my.cnf  #按照需求，修改软件安装位置。其他不需要改
LimitNOFILE = 5000
EOF
[root@db02 ~]# systemctl restart mysqld   <==启动服务
[root@db02 ~]# netstat -nltup | grep mysqld  #此时只允许本地登录
tcp6       0      0 :::3306                 :::*                    LISTEN      1385/mysqld
```
## 如何分析处理MySQL数据库无法启动
### without updating PID 类似错误 
#### 查看日志：
- **在哪？**
- **/data/mysql/data/主机名.err**
- **[ERROR] 上下文**

#### 可能情况：
- **/etc/my.cnf 路径不对等**
- **/tmp/mysql.sock文件修改过 或 删除过**
- **数据目录权限不是mysql**
- **参数改错了**

## 修改密码：
```bash
[root@db02 ~]# mysqladmin -u root -p原来的密码 password 591740
Enter password: 
mysqladmin: [Warning] Using a password on the command line interface can be insecure.
Warning: Since password will be sent to server in plain text, use ssl connection to ensure password safety.  <==警告：你的密码不安全，让人看见了都。
```
## 忘记密码：
### 关闭数据库
```bash
[root@db01 ~]# ps -ef | grep mysqld
mysql      1942      1  0 16:51 ?        00:00:01 /application/mysql/bin/mysqld --defaults-file=/etc/my.cnf
root       2019   1309  0 17:14 pts/0    00:00:00 grep --color=auto mysqld
[root@db02 ~]# systemctl stop mysqld
[root@db02 ~]# lsof -i :3306
```
### 启动数据库到维护模式
```bash
[root@db02 ~]# mysqld_safe --skip-grant-tables --skip-networking &
[root@db02 ~]# mysql
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 2
Server version: 5.7.26 MySQL Community Server (GPL)

Copyright (c) 2000, 2019, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> alter user root@'localhost' identified by '1';  #维护模式不允许执行此命令
ERROR 1290 (HY000): The MySQL server is running with the --skip-grant-tables option so it cannot execute this statement
mysql> flush privileges;  #刷新权限
Query OK, 0 rows affected (0.00 sec)

mysql> alter user root@'localhost' identified by '1';  #执行成功
Query OK, 0 rows affected (0.00 sec)
```
### 关闭数据库，并正常启动。
```bash
[root@db02 ~]# systemctl restart mysqld
[root@db02 ~]# mysql -u root -p
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 3
Server version: 5.7.26 MySQL Community Server (GPL)

Copyright (c) 2000, 2019, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> 
mysql> ^DBye
```
