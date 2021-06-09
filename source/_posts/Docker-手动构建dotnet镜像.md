---
title: Docker-手动构建dotnet镜像
author: 饼铛
cover: /images/img-163.png
tags:
  - Docker
  - Web集群
categories:
  - Web集群
abbrlink: 882d9505
date: 2020-07-21 17:25:00
---
## 1.docker环境
```bash
[root@wikifx2 ~]# docker image ls
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
nginx               latest              0901fa9da894        10 days ago         132MB
nginx               latest              0901fa9da894        10 days ago         132MB
alpine              latest              a24bb4013296        7 weeks ago         5.57MB
centos              7                   b5b4d78bc90c        2 months ago        203MB
[root@wikifx2 ~]# docker run -it a24bb4013296
/ # 
/ # [root@wikifx2 ~]# ctrl + p && ctrl + q #临时退出
[root@wikifx2 ~]# docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
173daf6285ba        a24bb4013296        "/bin/sh"           9 seconds ago       Up 8 seconds                            tender_ramanujan
[root@wikifx2 ~]#  docker attach 173daf6285ba #再次进入
```
## 2.查看源：
```bash
/ # cat /etc/apk/repositories 
http://dl-cdn.alpinelinux.org/alpine/v3.12/main
http://dl-cdn.alpinelinux.org/alpine/v3.12/community
```
## 3.修改源：
```bash
/ # sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories 
/ # cat /etc/apk/repositories 
http://mirrors.tuna.tsinghua.edu.cn/alpine/v3.12/main
http://mirrors.tuna.tsinghua.edu.cn/alpine/v3.12/community
```
## 4.构建缓存：
```bash
apk update
```
## 5.安装依赖：
```bash
/ # apk add libstdc++ icu libintl
```
## 6.安装 .NET Core Runtime
```bash
/ # wget https://download.visualstudio.microsoft.com/download/pr/34014520-3b9c-43a0-bc79-a5323655e235/fda26e0a67b9cf21ad648ff0c6259668/aspnet
core-runtime-3.1.6-linux-musl-x64.tar.gz

/ # mkdir -p /app/dotnet
/ # tar -xf aspnetcore-runtime-3.1.6-linux-musl-x64.tar.gz -C /app/dotnet/
```
## 7.编写启动脚本：
```bash
cd /wwwroot/ && /app/dotnet/dotnet WebApplication5.dll --urls http://0.0.0.0:8000
tail -f /etc/hosts

docker commit a35e206825ed wikifx_dotnet:v4   #存储为镜像
docker image save  7a4ab67f3701 > wikifx_dotnetv4.tar.gz  #导出
```
宿主机dotnet写的hello word项目：
```bash
[root@wikifx2 ~]# tree /wwwroot/
/wwwroot/
├── a624669980.tar.gz
├── appsettings.Development.json
├── appsettings.json
├── WebApplication5
├── WebApplication5.deps.json
├── WebApplication5.dll
├── WebApplication5.pdb
├── WebApplication5.runtimeconfig.json
└── web.config

0 directories, 9 files
```
## 8.启动：
`docker run -it -d -p 80:8000 -v /wwwroot:/wwwroot 7a4ab67f3701 /bin/sh /etc/init.sh`
![test](/images/img-164.png)

