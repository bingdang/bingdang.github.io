---
title: Zabbix-实现邮件+微信告警
author: 饼铛
cover: /images/img-134.png
tags:
  - Web集群
  - Zabbix
  - ''
categories:
  - Web集群
abbrlink: 2f09977b
date: 2020-03-24 21:58:00
---
## 1.邮件告警
### 1.1定义发件人
管理 > 报警媒介类型 > Email
![邮件发件人](/images/img-144.png)
### 1.2发件测试：
![发件测试](/images/img-145.png)
### 1.3定义收件人
- 个人资料 > 报警媒介 > 添加
- 确保动作已启用

### 1.4压力测试：
```bash
ab -n 10000 -c 4000 http://10.0.0.53/
```
![测试](/images/img-146.png)
### 1.5发信日志
报表 > 动作日志

### 1.6邮件格式
配置 > 动作 > 操作

## 2.微信告警
### 2.1加入企业微信
### 2.2关注微工作台
![企业微信助手](/images/img-147.png)
### 2.3创建企业应用
进入企业微信后台 > 应用管理 > 自建应用
获取企业应用信息：
![获取应用信息](/images/img-148.png)
### 2.3上传python脚本
```bash
#!/usr/bin/env python
#-*- coding: utf-8 -*-
#author: yanggd
#date: 2018-04-20
#comment: zabbix接入微信报警脚本

import requests
import sys
import os
import json
import logging

logging.basicConfig(level = logging.DEBUG, format = '%(asctime)s, %(filename)s, %(levelname)s, %(message)s',
                datefmt = '%a, %d %b %Y %H:%M:%S',
                filename = os.path.join('/tmp','weixin.log'),
                filemode = 'a')
#以下三项是根据你自己企业微信的信息填写
corpid='wwc74a658df899****'  
appsecret='uSDSLXWXxFAG_qjqL73SEmE2vbo1mSbQOK230****'
agentid=1000002
#获取accesstoken
token_url='https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' + corpid + '&corpsecret=' + appsecret
req=requests.get(token_url)
accesstoken=req.json()['access_token']

#发送消息
msgsend_url='https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=' + accesstoken

touser=sys.argv[1]
subject=sys.argv[2]
#toparty='3|4|5|6'
message=sys.argv[2] + "\n\n" +sys.argv[3]

params={
        "touser": touser,
#       "toparty": toparty,
        "msgtype": "text",
        "agentid": agentid,
        "text": {
                "content": message
        },
        "safe":0
}

req=requests.post(msgsend_url, data=json.dumps(params))

logging.info('sendto:' + touser + ';;subject:' + subject + ';;message:' + message)
```
### 2.4安装pip工具
`[root@db01 ~]# yum install python2-pip -y`

### 2.5安装依赖：
```bash
[root@db01 ~]# pip install requests -i http://mirrors.aliyun.com/pypi/simple -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com
```
### 2.6测试脚本：
`python weixin.py YaoFeiChi '外卖到了' '请到楼下取餐3/18 16:53'`

![微信告警测试](/images/img-149.png)

```bash
[root@db01 ~]# cat /application/zabbix/etc/zabbix_server.conf
LogFile=/application/zabbix/zabbix_server.log
DBHost=127.0.0.1
DBName=zabbix
DBUser=zabbix
DBPassword=123123a
DBPort=3306
Timeout=30
AlertScriptsPath=/application/zabbix/alertscripts #告警脚本存放目录
ExternalScripts=/application/zabbix/externalscripts
LogSlowQueries=3000

[root@db01 ~]# mkdir -p /application/zabbix/alertscripts
[root@db01 /application/zabbix/alertscripts]# chmod +x weixin.py 
[root@db01 /application/zabbix/alertscripts]# ll
总用量 4
-rwxr-xr-x 1 root root 1351 5月  24 21:27 weixin.py
```
### 2.7配置zabbix发件人：
进入zabbix > 管理 > 报警媒介类型 > 创建媒体类型 
![微信发件人](/images/img-150.png)
### 2.8参数：
```bash
{ALERT.SENDTO} //发给谁
{ALERT.SUBJECT} //报警标题
{ALERT.MESSAGE} //报警内容
```
**官方文档：**[https://www.zabbix.com/documentation/3.0/manual/introduction/whatsnew300](https://www.zabbix.com/documentation/3.0/manual/introduction/whatsnew300)
### 2.9配置zabbix收件人：
个人资料 > 报警媒介 > 添加 > 微信报警
![微信收件人](/images/img-151.png)
### 2.10微信脚本日志：
```bash
[root@db01 ~]# ll /tmp/weixin.log
-rw-rw-r-- 1 zabbix zabbix 2194 5月  24 21:47 /tmp/weixin.log. //注意日志权限
```
### 2.11结果：
![微信告警测试](/images/img-152.png)
