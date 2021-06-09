title: k8s企业级DevOps实践-搭建镜像仓库
author: 饼铛
cover: /images/pasted-6.png
abbrlink: 6cfd7a23
tags:
  - Docker
  - k8s
categories:
  - Web集群
date: 2021-04-10 01:54:00
---
## 搭建本地镜像仓库
```bash
[root@localhost ~]# cd /opt/
[root@localhost opt]# ll
总用量 1281480
-rw-r--r--. 1 root root 1312232098 4月  11 17:55 registry.tar.gz
[root@localhost opt]# tar -xf registry.tar.gz 
[root@localhost registry-data]# docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE

[root@localhost opt]# ls
registry-data  registry.tar.gz
[root@localhost opt]# cd registry-data/

[root@localhost registry-data]# ll
总用量 25728
drwxr-xr-x. 3 root root       20 4月   9 2020 registry
-rw-------. 1 root root 26344448 4月   9 2020 registry-v2.tar
[root@localhost registry-data]# docker load -i registry.tar.gz
registry/        registry-v2.tar  
[root@localhost registry-data]# docker load -i registry-v2.tar //加载仓库镜像
7444ea29e45e: Loading layer  4.671MB/4.671MB
9d08b7a37338: Loading layer  1.563MB/1.563MB
c62467775792: Loading layer  20.08MB/20.08MB
588f0b714a86: Loading layer  3.584kB/3.584kB
a330d9dc14ce: Loading layer  2.048kB/2.048kB
Loaded image: registry:2

[root@localhost registry-data]# docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
registry            2                   708bc6af7e5e        14 months ago       25.8MB
```

## docker镜像启动镜像仓库服务
```bash 
$ docker run -d -p 5000:5000 --restart always -v /opt/registry-data/registry:/var/lib/registry --name registry registry:2

## 默认仓库不带认证，若需要认证，参考https://docs.docker.com/registry/deploying/#restricting-access
```

假设启动镜像仓库服务的主机地址为192.168.56.10，该目录中已存在的镜像列表：

| 现镜像仓库地址                                               | 原镜像仓库地址                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| 192.168.56.10:5000/coreos/flannel:v0.11.0-amd64                | quay.io/coreos/flannel:v0.11.0-amd64                         |
| 192.168.56.10:5000/mysql:5.7                                   | mysql:5.7                                                    |
| 192.168.56.10:5000/nginx:alpine                                | nginx:alpine                                                 |
| 192.168.56.10:5000/centos:centos7.5.1804                       | centos:centos7.5.1804                                        |
| 192.168.56.10:5000/elasticsearch/elasticsearch:7.4.2           | docker.elastic.co/elasticsearch/elasticsearch:7.4.2          |
| 192.168.56.10:5000/fluentd-es-root:v1.6.2-1.0                  | gcr.io/google_containers/fluentd-elasticsearch:v2.4.0        |
| 192.168.56.10:5000/kibana/kibana:7.4.2                         | docker.elastic.co/kibana/kibana:7.4.2                        |
| 192.168.56.10:5000/kubernetesui/dashboard:v2.0.0-beta5         | kubernetesui/dashboard:v2.0.0-beta5                          |
| 192.168.56.10:5000/kubernetesui/metrics-scraper:v1.0.1         | kubernetesui/metrics-scraper:v1.0.1                          |
| 192.168.56.10:5000/kubernetes-ingress-controller/nginx-ingress-controller:0.30.0 | quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.30.0 |

## 推送本地镜像到镜像仓库中
```bash
   $ docker tag nginx:alpine localhost:5000/nginx:alpine
   $ docker push localhost:5000/nginx:alpine
   ## 我的镜像仓库给外部访问，不能通过localhost，尝试使用内网地址172.21.16.3:5000/nginx:alpine
   $ docker tag nginx:alpine 192.168.56.10:5000/nginx:alpine
   $ docker push 192.168.56.10:5000/nginx:alpine
   The push refers to repository [172.21.16.3:5000/nginx]
   Get https://192.168.56.10:5000/v2/: http: server gave HTTP response to HTTPS client
   ## docker默认不允许向http的仓库地址推送，如何做成https的，参考：https://docs.docker.com/registry/deploying/#run-an-externally-accessible-registry
   ## 我们没有可信证书机构颁发的证书和域名，自签名证书需要在每个节点中拷贝证书文件，比较麻烦，因此我们通过配置daemon的方式，来跳过证书的验证：
   $ cat /etc/docker/daemon.json
   {
     "registry-mirrors": [
       "https://8xpk5wnt.mirror.aliyuncs.com"
     ],
     "insecure-registries": [
        "192.168.56.10:5000"
     ]
   }
   $ systemctl restart docker
   $ docker push 192.168.56.10:5000/nginx:alpine
   $ docker images	# IMAGE ID相同，等于起别名或者加快捷方式
   REPOSITORY               TAG                 IMAGE ID            CREATED             SIZE
   192.168.56.10:5000/nginx   alpine              377c0837328f        4 weeks ago         
   nginx                    alpine              377c0837328f        4 weeks ago         
   localhost:5000/nginx     alpine              377c0837328f        4 weeks ago         
   registry                 2                   708bc6af7e5e        2 months ago       
```

