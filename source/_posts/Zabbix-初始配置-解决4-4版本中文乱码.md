---
title: Zabbix-初始配置&解决4.4版本中文乱码
author: 饼铛
cover: /images/img-134.png
tags:
  - Web集群
  - Zabbix
categories:
  - Web集群
abbrlink: f353577b
date: 2020-03-21 19:17:00
---
**1.禁用默认的Zabbix Server主机的监控**
Configuration > Hosts > 勾选Zabbix server > Disable

**2.禁用guest用户**
Administration > User groups > 勾选Guests > Disable

**3.更改admin的密码，防止弱口令爆破**
Administration > Users > Admin > Change password

**4.更改语言**
Administration > Users > Admin > Language

**5.中文乱码问题**
- 下载字体包：[https://github.com/maxsky/Yahei-Monaco-Hybrid-Font/archive/master.zip](https://github.com/maxsky/Yahei-Monaco-Hybrid-Font/archive/master.zip)
- 上传字体：`/application/nginx-1.16.1/html/zabbix/assets/fonts/`
YaHeiMonacoHybrid.ttf
- 修改字体：

```bash
sed -i 's#DejaVuSans#YaHeiMonacoHybrid#g' /application/nginx-1.16.1/html/zabbix/include/defines.inc.php
```
- 浏览器刷新zabbix页面
