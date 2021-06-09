---
title: 树莓派3B-安装java8部署Minecraft服务器
author: 饼铛
tags:
  - 树莓派
  - Minecraft
categories:
  - Minecraft
cover: /images/img-70.png
abbrlink: 8bd2a16a
date: 2020-04-13 07:47:00
---
#### 1.java8(arm)下载地址
 - 1）32位：
[https://github.com/frekele/oracle-java/releases/download/8u212-b10/jdk-8u212-linux-arm32-vfp-hflt.tar.gz](https://github.com/frekele/oracle-java/releases/download/8u212-b10/jdk-8u212-linux-arm32-vfp-hflt.tar.gz)

 - 2）64位：
[https://github.com/frekele/oracle-java/releases/download/8u212-b10/jdk-8u212-linux-arm64-vfp-hflt.tar.gz](https://github.com/frekele/oracle-java/releases/download/8u212-b10/jdk-8u212-linux-arm64-vfp-hflt.tar.gz)
---
#### 2.安装
##### 1）创建安装目录：
`mkdir -p /app/java`

##### 2）解压：
```bash
tar -xf jdk-8u212-linux-arm64-vfp-hflt.tar.gz -C /app/java/
```

##### 3）添加环境变量：
```bash
vim /etc/profile
export JAVA_HOME=/app/java/jdk1.8.0_212
export PATH=$JAVA_HOME/bin:$PATH
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar

. /etc/profile
```
---
#### 3.配置mc服务端：
##### 服务端整合包下载地址(空岛生存v1.9 兼容Minecraft客户端1.12.2)：[Download](https://pincheng.lanzous.com/ibbcc5g)

---
#### 4.部署：
```bash
tar -xf mc.tar.gz -C /app/
```

##### 1）编辑启动脚本(整合包中已添加)：
```bash
vim /app/mc/server.sh
java -Xms256M -Xmx1024M -jar ./Spigot-1.12.2.jar nogui

-Xms 为jvm启动时分配的内存，比如-Xms256m，表示分配256M
-Xmx 为jvm运行过程中分配的最大内存，比如-Xms1024m，表示jvm进程最多只能够占用1024M内存
#由于树莓派3B性能局限性，且这个mc服务端整合包是空岛生存对性能要求不高。所以我配置如上
-jar 接mc服务端jar文件
nogui 表示没有图形界面
```

##### 2）关闭服务端正版验证：
```bash
vim /app/mc/server.properties
onlin-mode=false  #这里改为false，否则盗版客户端进不去
```


##### 3）启动：
```bash
root@S01:~# cd /app/mc/
root@S01:/app/mc# ls
ASkyBlock            K.BAT              Spigot-1.12.2.jar
ASkyBlock_nether     libs               spigot.yml
banned-ips.json      logs               usercache.json
banned-players.json  ops.json           wepif.yml
bukkit.yml           permissions.yml    whitelist.json
commands.yml         plugins            world
data-storage         server.properties  world_nether
eula.txt             server.sh          world_the_end
help.yml             Spawn
root@S01:/app/mc# sh server.sh 
Loading libraries, please wait...
```

##### 4）启动成功：
![](/images/img-66.png)

---
#### 5.测试：
![ ](/images/img-67.png)

##### 1）添加树莓派服务器地址：
![ ](/images/img-68.png)

##### 2）连接进入：
![ ](/images/img-69.png)

![ ](/images/img-70.png)
