---
title: SVN-集中式版本控制系统部署
author: 饼铛
cover: /images/img-162.png
tags:
  - SVN
categories:
  - Web集群
abbrlink: fabc6ce1
date: 2020-07-15 13:37:34
---
## 0.版本控制工具
### 0.1功能
- 协同修改 
   - 多人并行不悖的修改服务器端的同一个文件。
- 数据备份
   - 如果本地文件发生丢失可以服务器端文件进行恢复。
- 增量式的版本管理
   - 服务器端保存每一个版本信息时只保存有修改的局部内容，节约服务器端资源。
- 权限控制
   - 对团队中参与开发的人员进行权限控制。
- 历史记录
   - 查看修改人、修改时间、修改内容、日志信息。
   - 将本地文件恢复到某一个历史状态。

### 0.2版本控制简介
#### 0.2.1版本控制 
工程设计领域中使用版本控制管理工程蓝图的设计过程。在 IT 开发过程中也可以 使用版本控制思想管理代码的版本迭代。
#### 0.2.2 版本控制工具 
 - **思想：**版本控制 
 - **实现：**版本控制工具
 - **集中式版本控制工具：** CVS、SVN、VSS……
 - **分布式版本控制工具：** Git

### 0.3SVN基本操作
- 检出（Checkout）
   - 把服务器端版本库内容完整下载到本地。
   - 在整个开发过程中只做一次。
- 更新（Update）
   - 把服务器端相对于本地的新的修改下载到本地。  
- 提交（Commit）
   - 把本地修改上传到服务器


## 1.安装SVN
```bash
[root@wikifx ~]# yum install subversion -y

[root@wikifx ~]# svn --version
svn，版本 1.7.14 (r1542130)
   编译于 Apr 11 2018，02:40:28

版权所有 (C) 2013 Apache 软件基金会。
此软件包含了许多人的贡献，请查看文件 NOTICE 以获得更多信息。
Subversion 是开放源代码软件，请参阅 http://subversion.apache.org/ 站点。

可使用以下的版本库访问模块: 

* ra_neon : 通过 WebDAV 协议使用 neon 访问版本库的模块。
  - 处理“http”方案
  - 处理“https”方案
* ra_svn : 使用 svn 网络协议访问版本库的模块。  - 使用 Cyrus SASL 认证
  - 处理“svn”方案
* ra_local : 访问本地磁盘的版本库模块。
  - 处理“file”方案
```
## 2.创建并配置版本库
### 2.1创建版本库目录和具体项目的目录
`[root@wikifx ~]# mkdir -p /data/svn/repository/{pro_oa,pro_erp}`

### 2.2创建svn的版本库
```bash
[root@wikifx ~]# svnadmin create /data/svn/repository/pro_oa/
[root@wikifx ~]# ll /data/svn/repository/pro_oa/
总用量 8
drwxr-xr-x 2 root root  54 7月  14 17:09 conf	#版本库的配置文件
drwxr-sr-x 6 root root 233 7月  14 17:09 db	#数据库存放目录
-r--r--r-- 1 root root   2 7月  14 17:09 format	
drwxr-xr-x 2 root root 231 7月  14 17:09 hooks	#钩子程序存放目录
drwxr-xr-x 2 root root  41 7月  14 17:09 locks
-rw-r--r-- 1 root root 229 7月  14 17:09 README.txt
```
## 3.配置SVN对应的服务
### 3.1思路
服务端指定： `/data/svn/repository/`
客户端访问：`svn://svnserver:3690/[pro_oa|pro_erp]`

### 3.2开机自启动
`[root@wikifx ~]# systemctl enable svnserve.service`

### 3.3SVN服务具体配置
```bash
[root@wikifx ~]# cat > /etc/sysconfig/svnserve <<EOF
# OPTIONS is used to pass command-line arguments to svnserve.
# 
# Specify the repository location in -r parameter:
OPTIONS="-r /data/svn/repository/" 
#防止一个SVN服务只能对应一个版本库，所以这里所有版本库的父目录。后期通过url访问到指定版本库
EOF
```
### 3.4启动验证
```bash
[root@wikifx ~]# netstat -lntup
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name        
tcp        0      0 0.0.0.0:3690            0.0.0.0:*               LISTEN      3040/svnserve 

[root@wikifx ~]# ps -ef | grep svnserve
root      3040     1  0 17:50 ?        00:00:00 /usr/bin/svnserve --daemon --pid-file=/run/svnserve/svnserve.pid -r /data/svn/repository/
```
## 4.SVN客户端交互
### 4.1创建两个工作目录模拟协同开发
```bash
[root@wikifx ~]# mkdir -p ~/workspace/{sony,link}
[root@wikifx ~]# cd workspace/
[root@wikifx ~/workspace]# ll
总用量 0
drwxr-xr-x 2 root root 6 7月  14 18:11 link
drwxr-xr-x 2 root root 6 7月  14 18:11 sony
```
### 4.2检出操作
- **作用：**完整下载版本库中的全部内容
- **命令：**`svn checkout svn://192.168.200.155/pro_oa ./`

```bash
[root@wikifx ~/workspace/link]# svn checkout svn://192.168.200.155/pro_oa ./
取出版本 0。
#版本库中不存在内容，所以检出为0

[root@wikifx ~/workspace/link]# ll -a
总用量 0
drwxr-xr-x 3 root root 18 7月  14 18:15 .
drwxr-xr-x 4 root root 30 7月  14 18:11 ..
drwxr-xr-x 4 root root 75 7月  14 18:15 .svn #<-保存本地目录和文件的状态信息，用来和SVN服务器进行交互。勿删勿改
#在指定的工作目录下创建了隐藏目录.svn，这个文件的父目录被称作工作副本；
#版本控制相关操作都需要在工作副本目录下执行，例如：提交，更新等。
```

### 4.2提交操作
```bash
1: 修改文件内容
[root@wikifx ~/workspace/link]# echo -e "felix1\nfelix2" > ~/workspace/link/felix.txt
[root@wikifx ~/workspace/link]# cat felix.txt 
felix1
felix2

2: 尝试提交报错
[root@wikifx ~/workspace/link]# svn commit felix.txt 
svn: E200009: 提交失败(细节如下): 
svn: E200009: “/root/workspace/link/felix.txt” 尚未纳入版本控制
#SVN要求在提交一个新建文件提交之前，必须要先纳入版本控制体系：svn add felix.txt

3: 纳入版本控制，再次尝试提交报错
[root@wikifx ~/workspace/link]# svn add felix.txt
A         felix.txt
[root@wikifx ~/workspace/link]# svn commit felix.txt 
svn: E205007: 提交失败(细节如下): 
svn: E205007: 无法使用外部编辑器获得日志信息；考虑设置环境变量 $SVN_EDITOR，或者使用 --message (-m) 或 --file (-F) 选项
svn: E205007: 没有设置 SVN_EDITOR，VISUAL 或 EDITOR 环境变量，运行时的配置参数中也没有 “editor-cmd” 选项
#SVN要求提交时，需要附加所提文件日志信息，用来标记本次操作做的修改：svn commit -m "My first commit" [文件名]

4：打开SVN匿名访问
[root@wikifx ~/workspace/link]# svn commit -m "My first commit" felix.txt 
svn: E170001: 提交失败(细节如下): 
svn: E170001: 认证失败
#提交时必须具备相应的权限，我们先打开匿名访问并给予写入权限【找到对应的版本库】
vim /data/svn/repository/pro_oa/conf/svnserve.conf
 19 anon-access = write [临时开启匿名访问]

5：尝试提交，成功
[root@wikifx ~/workspace/link]# svn commit -m "My first commit" felix.txt 
正在增加       felix.txt
传输文件数据.
提交后的版本为 1。
```
### 4.3查看操作
```bash
[root@wikifx ~]# svn list svn://192.168.200.155/pro_oa
felix.txt
```
## 5.SVN冲突
### 5.1 过时的文件
- 概念：在一个相对服务器端版本来说是旧版本的基础上进行了修改的文件。 
- 要求：所有过时的文件都必须先执行更新操作，更新后在最新版基础上修改的 文件才允许提交。

### 5.2冲突的产生
- 条件 1：本地当前编辑的文件已经过时。
- 条件 2：从服务器端更新下来的修改和本地的修改在“同文件同位置”不一致。

### 5.3冲突的表现
#### 5.3.1文件内
```bash
[root@wikifx ~/workspace/sony]# cat felix.txt
felix1
felix2
<<<<<<< .mine
felix4
felix3
=======  #发生冲突时本地自己的内容
felix3
felix4
>>>>>>> .r2 #发生冲突时服务端内容
```

#### 5.3.2目录内：
- `xxx.mine` 文件：发生冲突时本地文件内容
- `xxx.r[小版本号]` 文件：发生冲突前文件内容
- `xxx.r[大版本号]` 文件：发生冲突时服务器端文件内容

```bash
[root@wikifx ~/workspace/sony]# svn checkout svn://192.168.200.155/pro_oa ./
A    felix.txt
取出版本 1。

[root@wikifx ~/workspace/link]# cat felix.txt
felix1
felix2
felix3
felix4

[root@wikifx ~/workspace/link]# svn commit -m "My first commit2" felix.txt
正在发送       felix.txt
传输文件数据.
提交后的版本为 2。

[root@wikifx ~/workspace/sony]# cat felix.txt 
felix1
felix2
felix4
felix3

[root@wikifx ~/workspace/sony]# svn commit -m "My first commit3" felix.txt
正在发送       felix.txt
传输文件数据.svn: E160028: 提交失败(细节如下): 
svn: E160028: 文件 “/felix.txt” 已经过时
[root@wikifx ~/workspace/sony]# svn update felix.txt
正在升级 'felix.txt':
在 “/root/workspace/sony/felix.txt” 中发现冲突。
选择: (p) 推迟，(df) 显示全部差异，(e) 编辑,
        (mc) 我的版本, (tc) 他人的版本,
        (s) 显示全部选项: p
C    felix.txt
更新到版本 2。
冲突概要：
  正文冲突：1

[root@wikifx ~/workspace/sony]# cat felix.txt.r1 #发生冲突前文件内容
felix1
felix2
[root@wikifx ~/workspace/sony]# cat felix.txt.r2 #发生冲突时服务器端文件内容
felix1
felix2
felix3
felix4
[root@wikifx ~/workspace/sony]# cat felix.txt.mine #发生冲突时本地文件内容
felix1
felix2
felix4
felix3
```

### 5.4冲突解决：
#### 5.4.1手动解决 
- 第一步：删除冲突发生时产生的三个多余文件
- 第二步：删除冲突文件内多余的符号
- 第三步：把文件编辑到满意的状态
- 第四步：提交

#### 5.4.2工具解决
```bash
[root@wikifx ~/workspace/sony]# svn update felix.txt
正在升级 'felix.txt':
在 “/root/workspace/sony/felix.txt” 中发现冲突。
选择: (p) 推迟，(df) 显示全部差异，(e) 编辑,
        (mc) 我的版本, (tc) 他人的版本,
        (s) 显示全部选项: e
没有设置 SVN_EDITOR，VISUAL 或 EDITOR 环境变量，运行时的配置参数中也没有 “editor-cmd” 选项
选择: (p) 推迟，(df) 显示全部差异，(e) 编辑,
        (mc) 我的版本, (tc) 他人的版本,
        (s) 显示全部选项: 

#需要配置SVN_EDITOR环境变量，告知svn客户端vim的路径
which vim
/usr/bin/vim

echo -e "SVN_EDITOR=/usr/bin/vim\nexport SVN_EDITOR" >> /etc/bashrc
. /etc/bashrc

echo $SVN_EDITOR [验证]
/usr/bin/vim
```

### 5.5减少冲突的发生
- 尽可能在修改文件前先进行更新操作，尽量在最新版基础上修改文件内容。
- 尽量减少多人修改同一个文件的可能性。
- 加强团队成员之间的沟通。

## 6.分支
### 6.1 概念 
在版本控制过程中，使用多个分支同时推进多个不同功能开发。
**不使用分支开发：**人与人之间协作 
**使用分支开发：**小组和小组之间协作

### 6.2.应用场景举例 
- 蓝色皮肤界面功能：小组 1 
- 用户账号管理功能：小组 2 
- 支付功能：小组 3 

### 6.3作用
- 多个功能开发齐头并进同时进行  
- 任何一个分支上功能开发失败，删除即可，不会对其他分支造成影响

### 6.4分支相关目录
- trunk 主干
- branches 分支
- tags 存放项目开发过程中各个里程碑式的代码

## 7.SVN权限设置[svnserve.conf文件]
- 版本库配置文件的目录[进入指定版本库/conf]
   -  `/data/svn/repository/pro_oa/conf/`

```bash
/data/svn/repository/pro_oa/conf/
├── authz
├── passwd
└── svnserve.conf

vim /data/svn/repository/pro_oa/conf/svnserve.conf
 19 anon-access = none [关闭匿名访问]
 20 auth-access = write [打开授权访问]
 27 password-db = passwd [用passwd文件开启用户名+密码认证]
 34 authz-db = authz [用authz文件配置权限]
```
### 7.1添加用户[passwd文件]
**说明：**这里添加三个用户。kate用户预计单独分为一组测试只读权限，其他账号为一组测试读写权限。
**格式：**用户名 = 密码
```bash
[root@wikifx ~]# cat >> /data/svn/repository/pro_oa/conf/passwd <<EOF
pincheng = 123321
felix = 123321

kate = 123321
EOF
[root@wikifx ~]# cat /data/svn/repository/pro_oa/conf/passwd
### This file is an example password file for svnserve.
### Its format is similar to that of svnserve.conf. As shown in the
### example below it contains one section labelled [users].
### The name and password for each user follow, one account per line.

[users]
# harry = harryssecret
# sally = sallyssecret
pincheng = 123321
felix = 123321

kate = 123321
```

### 7.2配置权限[authz文件]
声明用户组：
```bash
vim /data/svn/repository/pro_oa/conf/authz
 21 [groups]
 22 # harry_and_sally = harry,sally
 23 # harry_sally_and_joe = harry,sally,&joe
 24 development = pincheng,felix  #开发组 = 成员1，成员2
 25 test = kate		#测试组 = 成员1
```
分配用户组权限：
```bash
vim /data/svn/repository/pro_oa/conf/authz
 32 [/] 			#指定路径。“/”针对此版本库根目录
 33 @development = rw 	#@组名1 = 读写
 34 @test = r 		#@组名2 = 只读
 35 * = 			#* = 表示除了上面已经授权的用户外，其他用户没有任何权限
```

svn win客户端推荐：https://tortoisesvn.net/
最新版小乌龟：[下载地址](https://osdn.net/frs/redir.php?m=xtom_hk&f=%2Fstorage%2Fg%2Ft%2Fto%2Ftortoisesvn%2F1.14.0%2FApplication%2FTortoiseSVN-1.14.0.28885-x64-svn-1.14.0.msi)

小乌龟汉化语言包：[下载地址](https://osdn.net/projects/tortoisesvn/storage/1.14.0/Language%20Packs/LanguagePack_1.14.0.28885-x64-zh_CN.msi/)
