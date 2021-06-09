---
title: MySQL-MHA的VIP高可用_邮件告警
author: 饼铛
cover: /images/img-71.png
tags:
  - MHA
  - MySQL
  - 高可用
  - 主从复制
categories:
  - DBA
abbrlink: c919a25c
date: 2020-04-29 18:13:00
---
## 1.MHA 的vip功能
### 1.1MHA开启vip的作用
- 用于支持应用透明，是构建主从高可用必须开启的功能
- 构建主从高可用参见：[https://pincheng.org/forward/c70898d5.html](https://pincheng.org/forward/c70898d5.html)

### 1.2MHA的vip功能
#### 1.2.1参数:
`master_ip_failover_script=/usr/local/bin/master_ip_failover`
注意：`/usr/local/bin/master_ip_failover`，必须事先准备好

#### 1.2.2编写perl脚本
```perl
vim /usr/local/bin/master_ip_failover
#!/usr/bin/env perl

use strict;
use warnings FATAL => 'all';

use Getopt::Long;

my (
    $command,          $ssh_user,        $orig_master_host, $orig_master_ip,
    $orig_master_port, $new_master_host, $new_master_ip,    $new_master_port
);

my $vip = '192.168.56.50/24';
my $key = '1';
my $ssh_start_vip = "/sbin/ifconfig eth1:$key $vip";
my $ssh_stop_vip = "/sbin/ifconfig eth1:$key down";

GetOptions(
    'command=s'          => \$command,
    'ssh_user=s'         => \$ssh_user,
    'orig_master_host=s' => \$orig_master_host,
    'orig_master_ip=s'   => \$orig_master_ip,
    'orig_master_port=i' => \$orig_master_port,
    'new_master_host=s'  => \$new_master_host,
    'new_master_ip=s'    => \$new_master_ip,
    'new_master_port=i'  => \$new_master_port,
);

exit &main();

sub main {

    print "\n\nIN SCRIPT TEST====$ssh_stop_vip==$ssh_start_vip===\n\n";

    if ( $command eq "stop" || $command eq "stopssh" ) {

        my $exit_code = 1;
        eval {
            print "Disabling the VIP on old master: $orig_master_host \n";
            &stop_vip();
            $exit_code = 0;
        };
        if ($@) {
            warn "Got Error: $@\n";
            exit $exit_code;
        }
        exit $exit_code;
    }
    elsif ( $command eq "start" ) {

        my $exit_code = 10;
        eval {
            print "Enabling the VIP - $vip on the new master - $new_master_host \n";
            &start_vip();
            $exit_code = 0;
        };
        if ($@) {
            warn $@;
            exit $exit_code;
        }
        exit $exit_code;
    }
    elsif ( $command eq "status" ) {
        print "Checking the Status of the script.. OK \n";
        exit 0;
    }
    else {
        &usage();
        exit 1;
    }
}

sub start_vip() {
    `ssh $ssh_user\@$new_master_host \" $ssh_start_vip \"`;
}
sub stop_vip() {
     return 0  unless  ($ssh_user);
    `ssh $ssh_user\@$orig_master_host \" $ssh_stop_vip \"`;
}

sub usage {
    print
    "Usage: master_ip_failover --command=start|stop|stopssh|status --orig_master_host=host --orig_master_ip=ip --orig_master_port=port --new_master_host=host --new_master_ip=ip --new_master_port=port\n";
}
```
#### 1.2.3修改配置文件：
`vim /etc/mha/app1.cnf`
添加：
`master_ip_failover_script=/usr/local/bin/master_ip_failover`

**注意**：
```bash
[root@db03 ~]# dos2unix /usr/local/bin/master_ip_failover 
dos2unix: converting file /usr/local/bin/master_ip_failover to Unix format ...
[root@db03 ~]# chmod +x /usr/local/bin/master_ip_failover 
```

#### 1.2.4vip初始化
主库上，手工生成第一个vip地址
手工在主库上绑定vip，注意一定要和配置文件中的ethN一致，我的是eth0:1(1是key指定的值)
ifconfig enp0s8:1 192.168.56.50/24
```bash
[root@db02 ~]# ifconfig enp0s8:1 192.168.56.50/24
[root@db02 ~]# ifconfig enp0s8:1
enp0s8:1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.56.50  netmask 255.255.255.0  broadcast 192.168.56.255
        ether 08:00:27:ae:c4:db  txqueuelen 1000  (Ethernet)

[root@db03 ~]# ping 192.168.56.50
PING 192.168.56.50 (192.168.56.50) 56(84) bytes of data.
64 bytes from 192.168.56.50: icmp_seq=1 ttl=64 time=0.479 ms
```

#### 1.2.5重启mha
```bash
masterha_stop --conf=/etc/mha/app1.cnf
nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover < /dev/null > /var/log/mha/app1/manager.log 2>&1 &
```

#### 1.2.6验证：
```bash
停止主库：
[root@db02 ~]# systemctl stop mysqld

漂移成功：
[root@db01 ~]# ifconfig enp0s8:1
enp0s8:1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.56.50  netmask 255.255.255.0  broadcast 192.168.56.255
        ether 08:00:27:e1:cc:67  txqueuelen 1000  (Ethernet)

恢复：
1.重启源主库现从库db02
[root@db02 ~]# systemctl start mysqld

2.mha编辑配置文件（db03）
vim /etc/mha/app1.cnf
[server2]
hostname=192.168.56.3
port=3306

3.查看从库初始化语句（db03）
[root@db03 ~]# grep -i 'change master to ' /var/log/mha/app1/manager

4.执行从库初始化（db02）
[root@db02 ~]# mysql
CHANGE MASTER TO 
MASTER_HOST='192.168.56.2', 
MASTER_PORT=3306, 
MASTER_AUTO_POSITION=1, 
MASTER_USER='repl', 
MASTER_PASSWORD='123';

db02 [(none)]>start slave;
db02 [(none)]>show slave status \G
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes

5.重启mha（db03）
masterha_check_ssh  --conf=/etc/mha/app1.cnf //检查ssh互信
masterha_check_repl  --conf=/etc/mha/app1.cnf //检查主从状态

[root@db03 ~]# nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover  < /dev/null> /var/log/mha/app1/manager.log 2>&1 &
[1] 30918
[root@db03 ~]# masterha_check_status --conf=/etc/mha/app1.cnf
app1 (pid:30918) is running(0:PING_OK), master:192.168.56.2
```

## 2.MHA vip漂移后的邮件告警

### 2.1 参数：
`report_script=/usr/local/bin/send`
### 2.2 准备邮件脚本
`send_report`
(1)准备发邮件的脚本(上传 email_2019-最新.zip中的脚本，到/usr/local/bin/中)
(2)将准备好的脚本添加到mha配置文件中,让其调用

![mail](/images/img-86.png)

(3)给脚本授权&手动发信测试
```bash
[root@db03 ~]# chmod +x /usr/local/bin/*
[root@db03 ~]# ll /usr/local/bin/
总用量 92
-rwxr-xr-x 1 root root  2228 4月  29 16:06 master_ip_failover
-rwxr-xr-x 1 root root    35 4月  29 16:51 send
-rwxr-xr-x 1 root root 80213 4月  29 16:51 sendEmail
-rwxr-xr-x 1 root root   206 4月  29 17:18 testpl
[root@db03 ~]# . /usr/local/bin/testpl
```
![mail](/images/img-87.png)

### 2.3修改manager配置文件，调用邮件脚本
```bash
vim /etc/mha/app1.cnf
report_script=/usr/local/bin/send
```

### 2.4重启MHA服务
```bash
#停止MHA
masterha_stop --conf=/etc/mha/app1.cnf
#开启MHA    
nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover < /dev/null > /var/log/mha/app1/manager.log 2>&1 &
```

### 2.5测试
```bash
[root@db03 ~]# masterha_check_status --conf=/etc/mha/app1.cnf
app1 (pid:1296) is running(0:PING_OK), master:192.168.56.2

#db01关闭数据库
[root@db01 ~]# systemctl stop mysqld

#db02检查vip漂移结果
[root@db02 ~]# ifconfig enp0s8:1
enp0s8:1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.56.50  netmask 255.255.255.0  broadcast 192.168.56.255
        ether 08:00:27:ae:c4:db  txqueuelen 1000  (Ethernet)

db02 [(none)]>show master status \G
*************************** 1. row ***************************
             File: mysql-bin.000003
         Position: 194
     Binlog_Do_DB: 
 Binlog_Ignore_DB: 
Executed_Gtid_Set: 9c0f7800-886a-11ea-b98c-0800273e0795:1-6
1 row in set (0.00 sec)

#db03检查
db03 [(none)]>show slave status \G
                  Master_Host: 192.168.56.3
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes
db03 [(none)]>^DBye
[1]+  完成                  nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover < /dev/null > /var/log/mha/app1/manager.log 2>&1  //master自杀

[root@db03 ~]# cat /etc/mha/app1.cnf 
[server default]
manager_log=/var/log/mha/app1/manager
manager_workdir=/var/log/mha/app1
master_binlog_dir=/data/binlog
master_ip_failover_script=/usr/local/bin/master_ip_failover
password=mha
ping_interval=2
repl_password=123
repl_user=repl
report_script=/usr/local/bin/send
ssh_user=root
user=mha
          //db01 被剔除
[server2]
hostname=192.168.56.3
port=3306

[server3]
hostname=192.168.56.4
port=3306
```
检查发信：
![mail](/images/img-88.png)

修复过程可参见1.2.6