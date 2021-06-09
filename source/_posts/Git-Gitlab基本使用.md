---
title: Git-Gitlab基本使用
author: 饼铛
cover: /images/img-160.png
tags:
  - git
  - gitlab
categories:
  - Web集群
abbrlink: 873540ab
date: 2019-06-22 15:30:00
---
## 1.Gitlab服务运维：
```bash
ll /opt/gitlab/                           #gitlab程序安装目录
ll /var/opt/gitlab/git-data/repositories/       	#所有项目都在存放在此目录，存放仓库数据
ll /var/log/gitlab/                   		  #所有服务日志目录

查看状态：
gitlab-ctl status

单独停掉ngixn：
gitlab-ctl stop nginx

查看所有服务日志：
gitlab-ctl tail
```