---
title: MySQL多实例配置
author: 饼铛
tags:
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: 4f3d60c1
date: 2019-04-09 21:48:00
---
#### 创建目录
`mkdir -p /data/330{7,8,9}/data`
**生成各自实例数据存储目录**
#### 准备配置文件
```bash
#3307实例
cat > /data/3307/my.cnf <<EOF
[mysqld]
basedir=/application/mysql  #软件目录
datadir=/data/3307/data  #本实例数据目录
socket=/data/3307/mysql.sock #本实例socket文件
log_error=/data/3307/mysql.log
port=3307
server_id=7
log_bin=/data/3307/mysql-bin
EOF
#3308实例
cat > /data/3308/my.cnf <<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3308/data
socket=/data/3308/mysql.sock
log_error=/data/3308/mysql.log
port=3308
server_id=8
log_bin=/data/3308/mysql-bin
EOF
#3309实例
cat > /data/3309/my.cnf <<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3309/data
socket=/data/3309/mysql.sock
log_error=/data/3309/mysql.log
port=3309
server_id=9
log_bin=/data/3309/mysql-bin
EOF
```
#### 各自实例初始化三套数据
```bash
mv /etc/my.cnf /etc/my.cnf.bak #防止原始配置文件影响后面数据库的初始化
mysqld --initialize-insecure  --user=mysql --datadir=/data/3307/data --basedir=/application/mysql
mysqld --initialize-insecure  --user=mysql --datadir=/data/3308/data --basedir=/application/mysql
mysqld --initialize-insecure  --user=mysql --datadir=/data/3309/data --basedir=/application/mysql
```
#### systemd管理多实例
```bash
cd /etc/systemd/system
cp mysqld.service mysqld3307.service
cp mysqld.service mysqld3308.service
cp mysqld.service mysqld3309.service
```
```bash
vim mysqld3307.service
ExecStart=/application/mysql/bin/mysqld  --defaults-file=/data/3307/my.cnf
```
```bash
vim mysqld3308.service
ExecStart=/application/mysql/bin/mysqld  --defaults-file=/data/3308/my.cnf
```
```bash
vim mysqld3309.service
ExecStart=/application/mysql/bin/mysqld  --defaults-file=/data/3309/my.cnf
```

#### 授权
`chown -R mysql.mysql /data/*`

#### 启动
```bash
systemctl start mysqld3307.service
systemctl start mysqld3308.service
systemctl start mysqld3309.service
```
#### 验证多实例
```bash
netstat -lnp|grep 330
mysql -S /data/3307/mysql.sock -e "select @@server_id"
mysql -S /data/3308/mysql.sock -e "select @@server_id"
mysql -S /data/3309/mysql.sock -e "select @@server_id"
```
