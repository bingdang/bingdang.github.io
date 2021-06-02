title: k8s企业级DevOps实践-最小linux系统alpine制作Docker基础镜像
author: 饼铛
cover: /images/pasted-56.png
tags:
  - Docker
  - k8s
categories:
  - Web集群
abbrlink: 8cd3cd17
date: 2021-05-11 14:18:00
---
[Alpine](https://www.alpinelinux.org/)简称高山的 是一款非常适合做k8s基础镜像的linux
1. 小巧：基于Musl libc和busybox，和busybox一样小巧，最小的Docker镜像只有5MB；
2. 安全：面向安全的轻量发行版；
3. 简单：提供APK包管理工具，软件的搜索、安装、删除、升级都非常方便。
4. 适合容器使用：由于小巧、功能完备，非常适合作为容器的基础镜像。

```Dockerfile
# nodejs环境，
FROM alpine+glibc环境

WORKDIR /app

RUN  sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories &&\
apk --no-cache add ca-certificates wget &&\
wget -q -O /etc/apk/keys/sgerrand.rsa.pub http://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub &&\
wget http://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk &&\
apk add --no-cache npm &&\
apk add --no-cache nodejs &&\
apk add --no-cache glibc-2.28-r0.apk &&\
apk add --no-cache curl &&\
rm -rf * &&\
apk add --no-cache -U tzdata && \
cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```

构建推送至镜像仓库
```bash
docker build . -t registry.cn-shanghai.aliyuncs.com/******/cake:alpine-glibc-nodejs
```