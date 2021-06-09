title: Docker安装Skywalking
author: 饼铛
cover: /images/pasted-25.png
tags:
  - Skywalking
  - 链路追踪
categories:
  - Web集群
abbrlink: d063782
date: 2020-07-22 09:25:00
---
## 采用H2部署oap
skywalking默认的数据存储方式即是内存数据库H2。该方式用于方便体验skywalking，但不推荐使用在生产环境。

运行容器命令：
```bash
docker run --name oap-h2 --restart always -d \
--restart=always \
-e TZ=Asia/Shanghai \
-p 12800:12800 \
-p 11800:11800 \
-e SW_STORAGE=h2 \
apache/skywalking-oap-server:8.3.0-es7
```
## 采用MySQL部署oap
需要注意原生的docker镜像中没有mysql驱动，所以需要手动上传mysql的驱动到/skywalking/oap-libs/下，命令如下：
```bash
docker cp mysql-connector-java-8.0.19.jar e2ea45eb7118124cf1d89bdf4eac1e798f857d1a2b6d7b43416bf30a57d2af6b:/skywalking/oap-libs/mysql-connector-java-8.0.19.jar
```
下面是运行容器命令：
```bash
docker run --name oap-mysql --restart always -d \
--restart=always \
-e TZ=Asia/Shanghai -p 12800:12800 -p 11800:11800 \
-e SW_STORAGE=mysql \
-e SW_JDBC_URL=jdbc:mysql://192.168.101.204:3306/swtest \
-e SW_DATA_SOURCE_USER=root \
-e SW_DATA_SOURCE_PASSWORD=12345678 \
apache/skywalking-oap-server:8.3.0-es7
```
## 采用ES部署oap
注意ES分为 es6和es7两个版本，所以在配置SW_STORAGE参数时需要注意区分elasticsearch7或者elasticsearch

下面是运行容器命令：ES7
```bash
docker pull apache/skywalking-oap-server:8.4.0-es7
docker pull apache/skywalking-ui:8.4.0

docker run --name skywalking-oap-server --restart always -d -p 11800:11800 -p 12800:12800 -e TZ=Asia/Shanghai \
-e SW_STORAGE=elasticsearch7 \
-e SW_NAMESPACE="sw_test" \
-e SW_STORAGE_ES_CLUSTER_NODES=192.168.200.148:9200 \
-e SW_ES_USER="elastic" \
-e SW_ES_PASSWORD="elastic1234" \
b4eaf1c3054e
```
4、运行skywalking-ui容器
运行容器命令：
```bash
docker run -d --name skywalking-ui --restart=always \
-e TZ=Asia/Shanghai \
-p 8080:8080 \
-e SW_OAP_ADDRESS=192.168.1.55:12800 \
5f4d7292cd19
```
PS：oap运行的很多参数详见：`apache-skywalking-apm-bin\config\application.yml` 配置文件