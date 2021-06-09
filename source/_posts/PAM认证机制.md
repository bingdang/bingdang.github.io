---
title: PAM认证机制
author: 饼铛
tags:
  - PAM
categories:
  - Web集群
cover: /images/img-72.png
abbrlink: 36cbf320
date: 2019-04-08 21:43:00
---
#### 1.介绍
**PAM:Pluggable Authentication Modules**
**认证库：文本文件，MySQL，NIS，LDAP等**
* Sun公司于1995 年开发的一种与**认证相关的通用框架机制**
* PAM 是关注如何为服务验证用户的 API，通过提供一些动态链接库和一套统一的API，将系统提供的服务和该服务的认证方式分开
* 使得管理员可以灵活地根据需要给不同的服务配置不同的认证方式而无需更改服务程序
* 一种认证框架，自身不做认证
* 它提供了对所有服务进行认证的中央机制，适用于本地登录，远程登录，如：telnet,rlogin,fsh,ftp,点对点协议PPP，su等应用程序中，系统管理员**通过PAM配置文件来制定不同应用程序的不同认证策略；**应用程序开发者通过在服务程序中使用PAM API(pam_xxxx( ))来实现对认证方法的调用；而PAM服务模块的开发者则利用PAM SPI来编写模块（主要调用函数pam_sm_xxxx( )供PAM接口库调用，将不同的认证机制加入到系统中；PAM接口库（libpam）则读取配置文件，将应用程序和相应的PAM服务模块联系起来

#### 2.PAM架构
![PAM架构](/images/img-18.png)

#### 3.pam认证原理
**PAM认证一般遵循这样的顺序：** 
* Service(服务)→PAM(配置文件)→pam_*.so
PAM认证首先要确定那一项服务，然后加载相应的PAM的配置文件(位于`/etc/pam.d`下)，最后调用同名的库文件实现控制

![认证过程](/images/img-19.png)

#### 4.PAM认证机制
##### PAM认证过程：
**1.使用者执行`passwd`程序，并输入密码**
**2.passwd开始调用PAM模块，PAM模块会搜寻`passwd`程序的PAM相关设置文件，这个设置文件一般是在`/etc/pam.d/`里边的与程序同名的文件，即PAM会搜寻`/etc/pam.d/pam_unix_passwd.so`此设置文件**
**3.经由`/etc/pam.d/pam_unix_passwd.so`设定文件的数据，取用PAM所提供的相关模块来进行验证**
**4.将验证结果回传给`passwd`这个程序，而`passwd`这个程序会根据PAM回传的结果决定下一个动作**（重新输入密码或者通过验证）

![PAN认证过程](/images/img-20.png)

#### 5.PAM相关文件
* **模块文件目录(库文件)：**`/lib64/security/*.so`
* **为每种应用模块提供一个专用的配置文件(服务相关)：**`/etc/pam.d/APP_NAME`
* **环境相关的设置(模块相关)：**`/etc/security/`
* **主配置文件(通用配置)：**`/etc/pam.conf`，默认不存在
**注意：**如`/etc/pam.d/`存在，`/etc/pam.conf`将失效

#### PAM的配置文件
##### （1）通用配置文件`/etc/pam.conf`格式
application type control module-path arguments

##### （2）专用配置文件`/etc/pam.d/*`格式
```bash
type control module-path arguments
```
##### （3）说明：
* 服务名（`application`）
 * `telnet、login、ftp`等，服务名字“`OTHER`”代表所有没有在该文件中明确配置的其它服务
* 模块类型（`module-type`）
 * `Auth` 账号的认证和授权
 * `Account` 与账号管理相关的非认证类的功能，如：
   * 用来限制/允许用户对某个服务的访问时间
   * 当前有效的系统资源(最多可以有多少个用户)
   * 限制用户的位置(例如：root用户只能从控制台登录)
 * `Session` 用户获取到服务之前或使用服务完成之后需要进行一些附加的操作，如：
   * 记录打开/关闭数据的信息，监视目录等
 * `Password` 用户修改密码时密码复杂度检查机制等功能
 * `-type` 表示因为确实而不能加载的模块将不记录到系统日志，对于那些不总是安装在系统上的模块有用，相当于注释
 
* `control` PAM库该如何处理与该服务相关的PAM模块的成功或失败情况
 * 例如，两个auth的认证配置。（检查它们之间的关系：与/或/非）
 * 实现方式：简单/复杂
 * 简单方式实现：一个关健词实现
   * `required` ：**一票否决**，表示本模块必须返回成功才能通过认证，但是如果该模块返回失败，失败结果也不会立即通知用户，而是要等到同一type中的所有模块全部执行完毕再将失败结果返回给应用程序，（类联合国五常）
     * **表示为必要条件**，且只影响所在类型模块的认证控制。
     * 该类型认证成功：表示这一步成功
     * 该类型认证失败：表示整个认证失败，会向下继续认证但是已经失败（“**相当于五常国家中 中国否决，其他国家继续表态，走过场**”）
![required](/images/img-22.png)
   * `requisite` ：**一票否决**,和上面类似，只不过其一旦失败。直接将失败结果返回给用户（“**相当于五常国家中 中国否决，其他国家不再表态。**”）
   * `sufficient`一票通过，表明本模块返回成功则通过身份认证的要求，不必再执行同一type内的其它模块，但如果**本模块返回失败可忽略**，即为充分条件（“**相当于一把手直接拍板**”）
     * 注意：如果前面存在一票否决控制参数已经失败，那么此条件就算满足也不会成功
     * 如果此行在首行，那么可直接返回成功
   * `optional`表明本模块是可选的，它的成功与否不会对身份认证起关键作用，其返回值一般被忽略
   * `include`调用其他的配置文件中定义的配置信息，相当于函数调用，把其他的文件调用于此
 * 复杂详细实现：使用一个或多个“status=action”
`[status1=action1 status2=action …]`
   * Status:检查结果的返回状态
   * Action:采取行为ok，done，die，bad，ignore，reset
   * ok 模块通过，继续检查
   * done 模块通过，返回最后结果给应用
   * bad 结果失败，继续检查
   * die 结果失败，返回失败结果给应用
   * ignore 结果忽略，不影响最后结果
   * reset 忽略已经得到的结果

* `module-path` 用来指明本模块对应的程序文件的路径名
 * 相对路径	/lib64/security目录下的模块可使用相对路径如：pam_shells.so、pam_limits.so
 * 绝对路径	模块通过读取配置文件完成用户对系统资源的使用控制/etc/security
* `Arguments` 用来传递给该模块的参数
 
**注意：**修改PAM配置文件将马上生效
**建议：**编辑pam规则时，保持至少打开一个root会话，防止配置改错了把自己堵在外面了。

**总结：**PAM通过提供一些动态链接库和一套统一的API，将系统提供的服务和该服务的认证方式分开，使得系统管理员可以灵活地根据需要给不同的服务配置不同的认证方式而无需更改服务程序，同时也便于向系统中添加新的认证手段。

#### PAM文档说明：
* `/usr/share/doc/pam-*` 
* rpm -qd pam
* man –k pam_
* man 模块名如 `man rootok`
* 参考：《[The Linux-PAM System Administrators’ Guide](http://linux-pam.org/Linux-PAM-html/)》
