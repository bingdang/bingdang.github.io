title: ELK-Filebeat7.4.0单机多实例
author: 饼铛
cover: /images/img-156.png
tags:
  - Web集群
  - ELK
abbrlink: 131c756
categories: []
date: 2020-06-12 08:22:00
---
## 1.起因
业务需求，已经转成json格式的nginx日志直接通过filebeat传入了Elasticsearch中，而其他程序日志需要通过filebeat传入logstash进行二次过滤。就需要解决多output的问题。而根据[官方文档](https://www.elastic.co/guide/en/beats/filebeat/7.x/configuring-output.html):
>You configure Filebeat to write to a specific output by setting options in the Outputs section of the `filebeat.yml` config file. Only a single output may be defined.

可知`filebeat.yml`中output有且只能有一个。当然你可以在`filebeat.yml`input模块中添加多个tags，并传递给logstash，并在logstash上通过不同的标签区分后传入不同的index中。


## 2.配置单机多实例
### 2.1 filebeat介绍
logstash 和filebeat都具有日志收集功能，因为filebeat由Golang编写相较于logstash更轻量，占用资源更少。所以决定在同一台机器上启动两个filebeat实例，分别用于拉取不同程序日志。
### 2.2分析原版filebeat的systemd启动脚本：
```bash
cat /usr/lib/systemd/system/filebeat.service

[Unit]
Description=Filebeat sends log files to Logstash or directly to Elasticsearch.
Documentation=https://www.elastic.co/products/beats/filebeat
Wants=network-online.target
After=network-online.target

[Service]
Environment="BEAT_LOG_OPTS=-e"
Environment="BEAT_CONFIG_OPTS=-c /etc/filebeat/filebeat.yml"
Environment="BEAT_PATH_OPTS=-path.home /usr/share/filebeat -path.config /etc/filebeat -path.data /var/lib/filebeat -path.logs /var/log/filebeat"
ExecStart=/usr/share/filebeat/bin/filebeat $BEAT_LOG_OPTS $BEAT_CONFIG_OPTS $BEAT_PATH_OPTS
Restart=always

[Install]
WantedBy=multi-user.target
```
### 2.3结合filebeat.yml可知：
- filebeat并不需要占用独立端口
- 依赖/etc/filebeat/filebeat.yml作为程序配置文件
- 依赖/var/lib/filebeat目录记录上次抓取指定日志的偏移量和时间戳
- 其他目录：
  - /usr/share/filebeat #filebeat程序家目录
  - /var/log/filebeat  #filebeat日志目录
  
### 2.4分别创建以上文件/目录
```bash
mkdir -p /var/log/filebeat2
mkdir -p /var/lib/filebeat2
cat > /etc/filebeat/filebeat_logstash.yml <<'EOF'


filebeat.inputs:
- type: log
  enabled: true
    - /var/applogs/*/*.log

  multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  multiline.negate: true
  multiline.match: after

filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
    reload.enabled: false

setup.template.settings:
  index.number_of_shards: 1

setup.kibana:

output.logstash:
  hosts: ["172.19.111.144:8080"]
  
processors:
  - add_host_metadata:
        netinfo.enabled: true
        cache.ttl: 5m

EOF

修改systemd启动脚本：
cat > /usr/lib/systemd/system/filebeat_logstash.service <<'EOF'
[Unit]
Description=Filebeat sends log files to Logstash or directly to Elasticsearch.
Documentation=https://www.elastic.co/products/beats/filebeat
Wants=network-online.target
After=network-online.target

[Service]
Environment="BEAT_LOG_OPTS=-e"
Environment="BEAT_CONFIG_OPTS=-c /etc/filebeat/filebeat_logstash.yml"
Environment="BEAT_PATH_OPTS=-path.home /usr/share/filebeat -path.logs /var/log/filebeat2 -path.data /var/lib/filebeat2"
ExecStart=/usr/share/filebeat/bin/filebeat $BEAT_LOG_OPTS $BEAT_CONFIG_OPTS $BEAT_PATH_OPTS
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```
