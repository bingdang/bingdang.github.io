---
title: Zabbix-LNMP环境下zabbix4.4的编译安装
author: 饼铛
cover: /images/img-134.png
tags:
  - Zabbix
  - Web集群
categories:
  - Web集群
abbrlink: ae26d423
date: 2020-03-21 18:44:00
---
## 1.安装要求
### 1.1硬件选型
**内存和磁盘：**
- Zabbix 运行需要物理内存和磁盘空间。如果刚接触 Zabbix，128 MB 的物理内存和 256 MB 的可用磁盘空间可能是一个很好的起点。 然而，所需的内存和磁盘空间显然取决于被监控的主机数量和配置参数。 如果您计划调整参数以保留较长的历史数据，那么您应该考虑至少有几 GB 磁盘空间，以便有足够的磁盘空间将历史数据存储在数据库中。

- 每个 Zabbix 守护程序进程都需要与数据库服务器建立多个连接。 为连接分配的内存量取决于数据库引擎的配置。

**CPU**
Zabbix，尤其是 Zabbix 数据库可能需要大量 CPU 资源，该具体取决于被监控参数的数量和所选的数据库引擎。

**其他硬件**
如果需要启用短信（SMS）通知功能，需要串行通讯口（serial communication port）和串行GSM调制解调器（serial GSM modem）。USB转串行转接器也同样可以工作。

**硬件资源配置参考**
下表提供了几个硬件配置参考：

|规模|平台|CPU/内存|数据库|受监控的主机数量|
|:-----|:-----|:-----|:-----|:-----|
小型|CentOS|Virtual Appliance|MySQL InnoDB|100|
|中型|CentOS|2 CPU cores/2GB|MySQL|InnoDB|500|
大型|RedHat Enterprise Linux|4 CPU cores/8GB|RAID10 MySQL InnoDB 或 PostgreSQL|>1000|
|极大型|RedHat Enterprise Linux|8 CPU cores/16GB|Fast RAID10 MySQL InnoDB 或 PostgreSQL|>10000|

## 2.环境准备：
|服务|版本|安装方法|
|:-----|:-----|:-----|
|zabbix|4.4.1|源码编译安装|
|MySQL|5.7|二进制安装|
|PHP|7.3.5|源码编译安装|
|Nginx|1.16.1|编译安装|

## 3.MySQL二进制安装
**参见：**[https://pincheng.org/forward/a7fae6f0.html](https://pincheng.org/forward/a7fae6f0.html)
### 3.1配置文件：
```
vim /data/mysql_3306/my.cnf
[mysqld]
basedir=/application/mysql
datadir=/data/mysql_3306/data
socket=/tmp/mysql.sock
log-error=/data/mysql_3306/mysql.log
log_bin=/data/binlog/mysql-bin
binlog_format=row
skip-name-resolve
server-id=52
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
relay_log_purge=0

max_connections=1024
back_log=128
wait_timeout=60
interactive_timeout=7200
key_buffer_size=16M
query_cache_size=64M
query_cache_type=1
query_cache_limit=50M
max_connect_errors=20
sort_buffer_size=2M
max_allowed_packet=32M
join_buffer_size=2M
thread_cache_size=200
innodb_buffer_pool_size=1024M
innodb_flush_log_at_trx_commit=1
innodb_log_buffer_size=32M
innodb_log_file_size=128M
innodb_log_files_in_group=3
binlog_cache_size=2M
max_binlog_cache_size=8M
max_binlog_size=512M
expire_logs_days=7
read_buffer_size=2M
read_rnd_buffer_size=2M
bulk_insert_buffer_size=8M
[client]
socket=/tmp/mysql.sock
```

### 3.2加载MySQL数据库函数库/etc/ld.so.conf
```bash
echo "/application/mysql-5.7.26-linux-glibc2.12-x86_64/lib/" >> /etc/ld.so.conf.d/mariadb-x86_64.conf

ldconfig //重建动态链接库缓存

[root@db01 ~]# ldconfig -p | grep libmysqlclient.so.20
[root@db01 ~]# echo "/application/mysql-5.7.26-linux-glibc2.12-x86_64/lib/" >> /etc/ld.so.conf.d/mariadb-x86_64.conf
[root@db01 ~]# ldconfig
[root@db01 ~]# ldconfig -p | grep libmysqlclient.so.20
        libmysqlclient.so.20 (libc6,x86-64) => /application/mysql-5.7.26-linux-glibc2.12-x86_64/lib/libmysqlclient.so.20
```

### 3.3创建zabbix库，并授权
```bash
create database zabbix default charset utf8mb4;
grant all on zabbix.* to 'zabbix'@'127.0.0.1' identified by '123123a';#授权一个用户
FLUSH PRIVILEGES; #刷新权限
```

## 4.Nginx编译安装
**参见**[https://pincheng.org/forward/bac240f7.html#10-编译安装nginx](https://pincheng.org/forward/bac240f7.html#10-编译安装nginx)
```bash
systemd启动：
[root@db01 ~]# chown -R www.www /application/nginx
cat >/lib/systemd/system/nginx.service<<'EOF'
[Unit]
Description=The NGINX HTTP and reverse proxy server
After=syslog.target network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/application/nginx/logs/nginx.pid
ExecStartPre=/application/nginx/sbin/nginx -t
ExecStart=/application/nginx/sbin/nginx
ExecReload=/application/nginx/sbin/nginx -s reload
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```
### 4.1配置nginx
```bash
vim /application/nginx/conf/nginx.conf
http{
include conf.d/*.conf; 加入
}

mkdir -p /application/nginx/conf/conf.d/

cat > /application/nginx/conf/conf.d/zabbix.conf <<'EOF'
server {
    listen 80;
    server_name 10.0.0.51; #本机IP
#    access_log /var/log/nginx/host.access.log main;
    location / {
        root html/zabbix;
        index index.html index.htm index.php;
    }
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root html/zabbix;
    }
    location ~ \.php$ {
        root html/zabbix;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include /application/nginx/conf/fastcgi_params;
    }
}
EOF
chown -R www.www /application/nginx/
```
## 5.PHP7.3编译安装
```bash
安装php依赖：
yum install zlib-devel libxml2-devel libjpeg-devel libjpeg-turbo-devel libiconv-devel -y
yum install freetype-devel libpng-devel gd-devel libcurl-devel libxslt-devel libxslt-devel -y
检查：
rpm -qa zlib-devel libxml2-devel libjpeg-turbo-devel libiconv-devel
rpm -qa freetype-devel libpng-devel gd-devel libcurl-devel libxslt-devel

id www
uid=1001(www) gid=1001(www) 组=1001(www)

补充依赖：
cd /server/tools/
wget http://www.mirrorservice.org/pub/gnu/libiconv/libiconv-1.16.tar.gz
tar -xf libiconv-1.16.tar.gz
cd libiconv-1.16/
./configure --prefix=/application/libiconv
make && make install

yum install libmcrypt-devel -y 
yum install mhash -y
yum install mcrypt -y

编译php73 //用户为www
cd /server/tools
wget http://mirrors.sohu.com/php/php-7.3.5.tar.gz
tar -xf php-7.3.5.tar.gz

cd php-7.3.5/
./configure \
--prefix=/application/php-7.3.5 \
--enable-mysqlnd  \
--with-mysqli=mysqlnd \
--with-pdo-mysql=mysqlnd \
--with-iconv-dir=/application/libiconv \
--with-freetype-dir \
--with-jpeg-dir \
--with-png-dir \
--with-zlib \
--with-libxml-dir=/usr \
--with-gettext \
--enable-xml \
--disable-rpath \
--enable-bcmath \
--enable-shmop \
--enable-sysvsem \
--enable-inline-optimization \
--with-curl \
--enable-mbregex \
--enable-fpm \
--enable-mbstring \
--with-gd \
--with-openssl \
--with-mhash \
--enable-pcntl \
--enable-sockets \
--with-xmlrpc \
--enable-soap \
--enable-short-tags \
--enable-static \
--with-xsl \
--with-fpm-user=www \
--with-fpm-group=www \
--enable-ftp \
--enable-opcache=no

[root@db01 /server/tools/php-7.3.5]# echo $?
0
[root@db01 /server/tools/php-7.3.5]# make && make install 
[root@db01 /server/tools/php-7.3.5]# echo $?
0
```
### 5.1配置php
```bash
[root@db01 /application]# ln -s /application/php-7.3.5/ /application/php
lrwxrwxrwx  1 root   root     23 5月  19 14:13 php -> /application/php-7.3.5/

配置php.ini(php解析器配置文件):
[root@db01 /server/tools/php-7.3.5]# cp php.ini-production /application/php/lib/php.ini

配置PHP FPM:
[root@db01 /application/php/etc]# cp php-fpm.conf.default php-fpm.conf
[root@db01 /application/php/etc]# cd php-fpm.d/
[root@db01 /application/php/etc/php-fpm.d]# cp www.conf.default www.conf

sed -i 's#;pid = run/php-fpm.pid#pid = run/php-fpm.pid#g' /application/php/etc/php-fpm.conf

启动测试：
[root@db01 ~]# /application/php/sbin/php-fpm
[root@db01 ~]# netstat -lntup
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 127.0.0.1:9000          0.0.0.0:*               LISTEN      29265/php-fpm: mast

[root@db01 ~]# chown -R www.www /application/php*
```
### 5.2systemd启动php
```bash
cat > /etc/systemd/system/php-fpm.service<<'EOF'
[Unit]
Description=The PHP FastCGI Process Manager
After=syslog.target network.target

[Service]
Type=forking
User=www
Group=www
PermissionsStartOnly=true
ExecStartPre=/usr/bin/chown www.www -R /application/php/
#PIDFile=/application/php/var/run/php-fpm.pid
ExecStart=/application/php/sbin/php-fpm --fpm-config /application/php/etc/php-fpm.conf
ExecStop=/bin/kill -INT $MAINPID

[Install]
WantedBy=multi-user.target
EOF

[root@db01 ~]# echo 'export PATH="/application/php/bin/:/application/php/sbin/:$PATH"' >> /etc/bashrc
[root@db01 ~]# . /etc/bashrc
[root@db01 ~]# php -v
PHP 7.3.5 (cli) (built: May 19 2020 14:08:45) ( NTS )
```

## 6.编译安装zabbix
### 6.1创建zabbix用户并安装依赖
```bash
useradd -s /sbin/nologin zabbix -M
yum -y install curl curl-devel net-snmp net-snmp-devel perl-DBI libevent-devel 


cd /server/tools
wget https://nchc.dl.sourceforge.net/project/zabbix/ZABBIX%20Latest%20Stable/4.4.1/zabbix-4.4.1.tar.gz
```

### 6.2编译安装
```bash
tar -xf zabbix-4.4.1.tar.gz
cd cd zabbix-4.4.1/
./configure \
--prefix=/application/zabbix \
--enable-server \
--enable-agent \
--with-mysql=/application/mysql/bin/mysql_config \
--with-net-snmp \
--with-libxml2 \
--with-libcurl
出现这个代表预编译成功：
***********************************************************
*            Now run 'make install'                       *
*                                                         *
*            Thank you for using Zabbix!                  *
*              <http://www.zabbix.com>                    *
***********************************************************

预编译说明：
--prefix= //安装到指定位置
--enable-server //安装zabbix server
--enable-agent //安装zabbix agent
--with-mysql= //指定mysql配置路径


make && make install
官方给的解释：对于虚拟机监视--with-libcurl和--with-libxml2配置选项是必需的; --with-libcurlSMTP身份验证和web.page.*Zabbix代理项也是必需的。
```

### 6.3配置zabbix_server
```bash
#环境变量
echo "export PATH=$PATH:/application/zabbix/sbin/:/application/zabbix/bin/" >>/etc/bashrc
[root@db01 ~]# . /etc/etc/bashrc
[root@db01 ~]# zabbix_
zabbix_agentd  zabbix_get     zabbix_sender  zabbix_server 

chown -R zabbix.zabbix /application/zabbix/

[root@db01 ~]# zabbix_server --version
zabbix_server (Zabbix) 4.4.1
Revision 8870606e6a 28 October 2019, compilation time: May 19 2020 16:00:18
```

### 6.4导入zabbix的sql脚本
```bash
mysql -uzabbix -p123123a -h127.0.0.1 zabbix < /server/tools/zabbix-4.4.1/database/mysql/schema.sql 
mysql -uzabbix -p123123a -h127.0.0.1 zabbix < /server/tools/zabbix-4.4.1/database/mysql/images.sql 
mysql -uzabbix -p123123a -h127.0.0.1 zabbix < /server/tools/zabbix-4.4.1/database/mysql/data.sql
```
### 6.5配置zabbix_server
```bash
echo '
LogFile=/application/zabbix/zabbix_server.log           //zabbix日志文件
DBHost=127.0.0.1
DBName=zabbix
DBUser=zabbix
DBPassword=123123a
DBPort=3306
Timeout=30
AlertScriptsPath=/application/zabbix/alertscripts       //邮件微信告警
ExternalScripts=/application/zabbix/externalscripts
LogSlowQueries=3000                                     //慢查询相关
' > /application/zabbix/etc/zabbix_server.conf
```

### 6.6启动zabbix_server
```bash
[root@db01 ~]# zabbix_server
[root@db01 ~]# ps -aux | grep zabbix
[root@db01 ~]# netstat -lntup | grep zabbix
tcp        0      0 0.0.0.0:10050           0.0.0.0:*               LISTEN      27647/zabbix_agentd 
tcp        0      0 0.0.0.0:10051           0.0.0.0:*               LISTEN      7221/zabbix_server
[root@db01 ~]# cat /application/zabbix/zabbix_server.log
```

## 7.配置zabbix_web
```bash
[root@db01 ~]# mkdir -p /application/nginx/html/zabbix/
[root@db01 ~]# cp -ar /server/tools/zabbix-4.4.1/frontends/php/* /application/nginx/html/zabbix/
[root@db01 ~]# chown -R www.www /application/nginx/
```

### 7.1访问zabbix_web
http://10.0.0.51/
![p1](/images/img-128.png)
### 7.2根据提示优化告警：
```bash
sed -i 's#post_max_size = 8M#post_max_size = 32M#g' /application/php/lib/php.ini
sed -i 's#max_execution_time = 30#max_execution_time = 300#g' /application/php/lib/php.ini
sed -i 's#max_input_time = 60#max_input_time = 300#g' /application/php/lib/php.ini
sed -i 's#;date.timezone =#date.timezone = Asia/Shanghai#g' /application/php/lib/php.ini
systemctl restart php-fpm
```
### 7.3继续安装：
![p2](/images/img-129.png)
![p3](/images/img-130.png)
![p4](/images/img-131.png)
### 7.4登陆zabbix_web：
**默认账号:**Admin
**默认密码:**zabbix
![p5](/images/img-132.png)
![p6](/images/img-133.png)
