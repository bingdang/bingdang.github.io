title: k8s企业级DevOps实践-Django应用容器化实践
author: 饼铛
cover: /images/pasted-6.png
tags:
  - Docker
  - k8s
categories:
  - Web集群
abbrlink: 3ea5fff1
date: 2021-04-10 09:55:00
---
## django项目介绍

- 项目地址：https://gitee.com/pinchengx/pythondemo.git
- python3 + uwsgi + nginx + mysql
- 内部服务端口8002

![项目内数据库配置](/images/pasted-9.png)
### 构建命令

```powershell
$ docker build . -t ImageName:ImageTag -f Dockerfile
```

如何理解构建镜像的过程？

Dockerfile是一堆指令，在docker build的时候，按照该指令进行操作，最终生成我们期望的镜像

- FROM 指定基础镜像，必须为第一个命令


  ```
  格式：
  	FROM <image>
  	FROM <image>:<tag>
  示例：
  	FROM mysql:5.7
  注意：
  	tag是可选的，如果不使用tag时，会使用latest版本的基础镜像
  ```

- MAINTAINER 镜像维护者的信息


  ```
  格式：
  	MAINTAINER <name>
  示例：
  	  MAINTAINER Yongxin Li
      MAINTAINER inspur_lyx@hotmail.com
      MAINTAINER Yongxin Li <inspur_lyx@hotmail.com>
  ```

- COPY|ADD 添加本地文件到镜像中


  ```
  格式：
  	COPY <src>... <dest>
  示例：
      ADD hom* /mydir/          # 添加所有以"hom"开头的文件
      ADD test relativeDir/     # 添加 "test" 到 `WORKDIR`/relativeDir/
      ADD test /absoluteDir/    # 添加 "test" 到 /absoluteDir/
  ```

- WORKDIR 工作目录


  ```
  格式：
  	WORKDIR /path/to/workdir
  示例：
      WORKDIR /a  (这时工作目录为/a)
  注意：
      通过WORKDIR设置工作目录后，Dockerfile中其后的命令RUN、CMD、ENTRYPOINT、ADD、COPY等命令都会在该目录下执行
  ```

- RUN 构建镜像过程中执行命令


  ```
  格式：
  	RUN <command>
  示例：
      RUN yum install nginx
      RUN pip install django
      RUN mkdir test && rm -rf /var/lib/unusedfiles
  注意：
      RUN指令创建的中间镜像会被缓存，并会在下次构建中使用。
      如果不想使用这些缓存镜像，可以在构建时指定--no-cache参数，如：docker build --no-cache
  ```

- CMD 构建容器后调用，也就是在容器启动时才进行调用


  ```
  格式：
      CMD ["executable","param1","param2"] (执行可执行文件，优先)
      CMD ["param1","param2"] (设置了ENTRYPOINT，则直接调用ENTRYPOINT添加参数)
      CMD command param1 param2 (执行shell内部命令)
  示例：
      CMD ["/usr/bin/wc","--help"]
      CMD ping www.baidu.com
  注意：
      CMD不同于RUN，CMD用于指定在容器启动时所要执行的命令，而RUN用于指定镜像构建时所要执行的命令。
  ```

- ENTRYPOINT 设置容器初始化命令，使其可执行化


  ```
  格式：
      ENTRYPOINT ["executable", "param1", "param2"] (可执行文件, 优先)
      ENTRYPOINT command param1 param2 (shell内部命令)
  示例：
      ENTRYPOINT ["/usr/bin/wc","--help"]
  注意：
  	ENTRYPOINT与CMD非常类似，不同的是通过docker run执行的命令不会覆盖ENTRYPOINT，而docker run命令中指定的任何参数，都会被当做参数再次传递给ENTRYPOINT。Dockerfile中只允许有一个ENTRYPOINT命令，多指定时会覆盖前面的设置，而只执行最后的ENTRYPOINT指令
  ```

- ENV 设置容器内环境变量


  ```
  格式：
      ENV <key> <value>
      ENV <key>=<value>
  示例：
      ENV myName John
      ENV myCat=fluffy
  ```

- EXPOSE 设置容器对外暴露的端口


  ```
  格式：
      EXPOSE <port> [<port>...]
  示例：
      EXPOSE 80 443
      EXPOSE 8080
      EXPOSE 11211/tcp 11211/udp
  注意：
      EXPOSE并不会让容器的端口访问到主机。要使其可访问，需要在docker run运行容器时通过-p来发布这些端口，或通过-P参数来发布EXPOSE导出的所有端口
  
  ```


![Dockerfile介绍](/images/pasted-7.png)

Dockerfile
```bash
# This my first django Dockerfile
# Version 1.0

# Base images 基础镜像
FROM centos:centos7.5.1804

#MAINTAINER 维护者信息
LABEL maintainer="admin@pincheng.org"

#ENV 设置环境变量
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8

#RUN 执行以下命令
RUN curl -so /etc/yum.repos.d/Centos-7.repo http://mirrors.aliyun.com/repo/Centos-7.repo
RUN yum install -y  python36 python3-devel gcc pcre-devel zlib-devel make net-tools

#工作目录
WORKDIR /opt/myblog

#拷贝本地文件至Docker工作目录
COPY . .

#安装nginx
RUN tar -zxf nginx-1.16.1.tar.gz -C /opt  && cd /opt/nginx-1.16.1 && ./configure --prefix=/usr/local/nginx \
&& make && make install && ln -s /usr/local/nginx/sbin/nginx /usr/bin/nginx

RUN cp myblog.conf /usr/local/nginx/conf/myblog.conf

#安装依赖的插件
RUN pip3 install -i http://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt

RUN chmod +x run.sh && rm -rf ~/.cache/pip

#EXPOSE 映射端口
EXPOSE 8002

#容器启动时执行命令
CMD ["./run.sh"]
```
## 执行构建
```bash
[root@localhost ~]# git clone https://gitee.com/pinchengx/pythondemo.git
正克隆到 'pythondemo'...
remote: Enumerating objects: 174, done.
remote: Counting objects: 100% (174/174), done.
remote: Compressing objects: 100% (124/124), done.
remote: Total 174 (delta 43), reused 171 (delta 43), pack-reused 0
接收对象中: 100% (174/174), 549.02 KiB | 0 bytes/s, done.
处理 delta 中: 100% (43/43), done.

[root@localhost ~]# ls
anaconda-ks.cfg  pythondemo
[root@localhost ~]# cd pythondemo/
[root@localhost pythondemo]# vi Dockerfile
[root@localhost pythondemo]# docker build . -t myblog:v1 -f Dockerfile
Sending build context to Docker daemon   3.13MB
Step 1/14 : FROM centos:centos7.5.1804
 ---> cf49811e3cdb
Step 2/14 : LABEL maintainer="admin@pincheng.org"
 ---> Running in 57284e4faa85
Removing intermediate container 57284e4faa85
 ---> 5a5064f11010
Step 3/14 : ENV LANG en_US.UTF-8
 ---> Running in 5580a38c898a
 
.....

Step 12/14 : RUN chmod +x run.sh && rm -rf ~/.cache/pip
 ---> Running in d90abf9fd8bc
Removing intermediate container d90abf9fd8bc
 ---> 07799364dfdc
Step 13/14 : EXPOSE 8002
 ---> Running in 5d4a87c278d6
Removing intermediate container 5d4a87c278d6
 ---> c696f083eda2
Step 14/14 : CMD ["./run.sh"]
 ---> Running in c9be094b20ef
Removing intermediate container c9be094b20ef
 ---> 0a05e540407f
Successfully built 0a05e540407f
Successfully tagged myblog:v1 //构建成功
```

## 定制化基础镜像
**原因：**基础镜像中存在Python环境以及Nginx。业务镜像基于此基础镜像进行构建可以大大节省业务镜像的构建成本和时间

```dockerfile
# pythondemo/Dockerfile-base
# Base images 基础镜像
FROM centos:centos7.5.1804

#MAINTAINER 维护者信息
LABEL maintainer="admin@pincheng.org"

#ENV 设置环境变量
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8

#RUN 执行以下命令
RUN curl -so /etc/yum.repos.d/Centos-7.repo http://mirrors.aliyun.com/repo/Centos-7.repo
RUN yum install -y  python36 python3-devel gcc pcre-devel zlib-devel make net-tools

COPY nginx-1.16.1.tar.gz  /opt

#安装nginx
RUN tar -zxf /opt/nginx-1.16.1.tar.gz -C /opt  && cd /opt/nginx-1.16.1 && ./configure --prefix=/usr/local/nginx && make && make install && ln -s /usr/local/nginx/sbin/nginx /usr/bin/nginx
```
### 构建基础镜像
```bash
$ docker build . -t centos-python3-nginx:v1 -f Dockerfile-base
$ docker tag centos-python3-nginx:v1 192.168.56.10:5000/base/centos-python3-nginx:v1
$ docker push 192.168.56.10:5000/base/centos-python3-nginx:v1The push refers to repository [192.168.56.10:5000/base/centos-python3-nginx]
42f8946f2974: Pushed 
a74fe1f5e36f: Pushed 
1be36d417e09: Pushed 
47ad3ab7c395: Pushed 
4826cdadf1ef: Pushed 
v1: digest: sha256:1ad23deee53bb54c7b7d8b08bb133c37d933f14e881fdd7ab4660ac0d901bcb1 size: 1370
```

### 简化业务Dockerfile
**即：**利用构建好的基础镜像省去80%步骤，专注于代码依赖等环境。
```dockerfile
# pythondemo/Dockerfile-optimized
# This my first django Dockerfile
# Version 1.0

# Base images 基础镜像
FROM centos-python3-nginx:v1

#MAINTAINER 维护者信息
LABEL maintainer="admin@pincheng.org"

#工作目录
WORKDIR /opt/myblog

#拷贝文件至工作目录
COPY . .

RUN cp myblog.conf /usr/local/nginx/conf/myblog.conf

#安装依赖的插件
RUN pip3 install -i http://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt

RUN chmod +x run.sh && rm -rf ~/.cache/pip

#EXPOSE 映射端口
EXPOSE 8002

#容器启动时执行命令
CMD ["./run.sh"]
```

```bash
$ docker build . -t myblog:v2 -f Dockerfile-optimized
```
## 运行mysql

```bash
$ docker run -d -p 3306:3306 --name mysql  -v /opt/mysql/mysql-data/:/var/lib/mysql -e MYSQL_DATABASE=myblog -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7

//生产环境下，不建议将数据库安装在容器中。此处为演示

## 查看数据库
$ docker exec -ti mysql bash
#/ mysql -uroot -p123456
#/ show databases;

## navicator连接
```
![测试](/images/pasted-8.png)

## 启动Django应用
```bash
## 启动容器
$ docker run -d -p 8002:8002 --name myblog -e MYSQL_HOST=192.168.56.10 -e MYSQL_USER=root -e MYSQL_PASSWD=123456 myblog:v2
```
![启动项目](/images/pasted-10.png)

```bash
## migrate mysql初始化项目数据
$ docker exec -ti myblog bash
#/ python3 manage.py makemigrations
#/ python3 manage.py migrate
#/ python3 manage.py createsuperuser

## 创建超级用户
$ docker exec -ti myblog python3 manage.py createsuperuser

## 收集静态文件
## $ docker exec -ti myblog python3 manage.py collectstatic
```

![初始化](/images/pasted-11.png)

![登陆](/images/pasted-12.png)

## 构建mysql镜像，替换默认编码
解决项目无法保存中文问题
`dockerfiles/mysql/my.cnf`

```powershell
$ cat my.cnf
[mysqld]
user=root
character-set-server=utf8
lower_case_table_names=1

[client]
default-character-set=utf8
[mysql]
default-character-set=utf8

!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/
```

`dockerfiles/mysql/Dockerfile`

```dockerfile
FROM mysql:5.7
COPY my.cnf /etc/mysql/my.cnf
## CMD或者ENTRYPOINT默认继承
```

```powershell
$ docker build . -t mysql:5.7-utf8
$ docker tag mysql:5.7-utf8 172.21.16.3:5000/mysql:5.7-utf8
$ docker push 172.21.16.3:5000/mysql:5.7-utf8

## 删除旧的mysql容器，使用新镜像启动,不用再次初始化
$ docker rm -f mysql
$ rm -rf /opt/mysql/mysql-data/*
$ docker run -d -p 3306:3306 --name mysql -v /opt/mysql/mysql-data/:/var/lib/mysql -e MYSQL_DATABASE=myblog -e MYSQL_ROOT_PASSWORD=123456 172.21.32.6:5000/mysql:5.7-utf8

## 重新migrate
$ docker exec -ti myblog bash
#/ python3 manage.py makemigrations
#/ python3 manage.py migrate
#/ python3 manage.py createsuperuser
```
至此，Django项目容器化已完成。
