---
title: Git-C7下Gitlab-12.3.5安装
author: 饼铛
cover: /images/img-160.png
tags:
  - git
  - gitlab
categories:
  - Web集群
abbrlink: 60c1bc2d
date: 2019-06-22 14:39:00
---
## 1.GitLab 概述：
　　是一个利用 Ruby on Rails 开发的开源应用程序，实现一个自托管的 Git 项目仓库，可通过 Web界面进行访问公开的或者私人项目。Ruby on Rails 是一个可以使你开发、部署、维护 web 应用程序变得简单的框架。
  
   GitLab 拥有不 Github 类似的功能，能够浏览源代码，管理缺陷和注释。可以管理团队对仓库的访问，它非常易于浏览提交过的版本并提供一个文件历史库。它还提供一个代码片段收集功能可以轻松实现代码复用，便于日后有需要的时候进行查找。
**GitLab 中文网：**[https://www.gitlab.cc/installation/#centos-7](https://www.gitlab.cc/installation/#centos-7)

## 2.GitHub 和 GitLab 的区别:

### 2.1相同点: 
- 二者都是基于 web 的 Git 仓库，在很大程度上 GitLab 是仿照 GitHub 来做的，它们都提供了分享开源项目的平台，为开发团队提供了存储、分享、发布和合作开发项目的中心化云存储的场所。

### 2.2不同点：
- GitHub 如果要使用私有仓库，超过 3 个人就收费。GitLab 可以在上面创建私人的克费仓库。
- GitLab 让开发团队对他们的代码仓库拥有更多的控制，相比于 GitHub，它有不少的特色：允许免费设置仓库权限；允许用户选择分享一个 project 的部分代码；允许用户设置 project 的获取权限，进一步的提升安全性；可以设置获取到团队整体的改进进度；通过 innersourcing 让不在权限范围内的人访问不到该资源。

总结：从代码私有性方面来看，有时公司并不希望员工获取到全部的代码，这个时候 GitLab 无疑是更好的选择。但对于开源项目而言，GitHub 依然是代码托管的首选。

## 3.git 相关概念：
- git 是一种版本控制系统，是一个命令，是一种工具
- gitlib 是用于实现 git 功能的开发库
- github 是一个基于 git 实现的在线代码托管仓库，包含一个网站界面，向互联网开放
- gitlab 是一个基于 git 实现的在线代码仓库托管软件，一般用于在企业内部网络搭建 git 私服

注： gitlab-ce 社区版，免费； gitlab-ee 是企业版，收费

## 4.安装Gitlab组件:
**需要最少6G内存，内存不足后期访问报502**
`yum install curl policycoreutils openssh-server openssh-clients postfix -y`

## 5.下载Gitlab
github下载：[https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/gitlab-ce-12.3.5-ce.0.el7.x86_64.rpm](https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/gitlab-ce-12.3.5-ce.0.el7.x86_64.rpm)
汉化包下载：[https://gitlab.com/xhang/gitlab/-/tags](https://gitlab.com/xhang/gitlab/-/tags)

## 6.安装完成之后，修改gitlab访问地址:
```bash
yum localinstall gitlab-ce-12.3.5-ce.0.el7.x86_64.rpm -y
vim /etc/gitlab/gitlab.rb
#设置访问url和关闭prometheus
external_url 'http://git.pincheng.org'
#如果安装普罗米修斯全家桶需要4G内存
prometheus_monitoring['enable'] = false
#配置gitlab通过smtp发送邮件

gitlab_rails['gitlab_email_enabled'] = true
gitlab_rails['gitlab_email_from'] = 'felixwww@163.com'
gitlab_rails['gitlab_email_display_name'] = 'china'
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "smtp.163.com"
gitlab_rails['smtp_port'] = 25
gitlab_rails['smtp_user_name'] = "felixwww@163.com"
gitlab_rails['smtp_password'] = "IVKCTETTCMZWTGWW"
gitlab_rails['smtp_domain'] = "163.com"
gitlab_rails['smtp_authentication'] = "login"
gitlab_rails['smtp_enable_starttls_auto'] = true

#应用重新配好的配置并重启gitlab
gitlab-ctl  reconfigure
```

## 7.访问测试
本机host添加`192.168.200.155 git.pincheng.org`
http://git.pincheng.org/
为root用户设置初始密码，并登录。

![gitlab](/images/img-158.png)

## 8.Gitlab汉化
```bash
[root@wikifx ~]# unzip AEIOUAEIOU-xhang_gitlab-v12.3.5-zh.zip
[root@wikifx ~]# cat xhang_gitlab/VERSION 
12.3.5

\cp -a xhang_gitlab/*  /opt/gitlab/embedded/service/gitlab-rails/
#这里会有两个报错，因为这里两个软连接

[root@wikifx ~]# gitlab-ctl start
ok: run: gitaly: (pid 1960) 556s
ok: run: gitlab-workhorse: (pid 1985) 555s
ok: run: logrotate: (pid 1848) 594s
ok: run: nginx: (pid 1827) 600s
ok: run: postgresql: (pid 1579) 691s
ok: run: redis: (pid 1416) 708s
ok: run: sidekiq: (pid 1779) 614s
ok: run: unicorn: (pid 1747) 620s
注：等待！8080端口起不来会出现 502 报错
```

![hanhu](/images/img-159.png)