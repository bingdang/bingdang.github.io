title: k8s企业级DevOps实践-Kubernetes架构、Kubernetes集群安装(两种方式)
author: 饼铛
cover: images/pasted-6.png
tags:
  - k8s
categories:
  - Web集群
abbrlink: 57e2aa11
date: 2021-04-25 17:44:00
---
## Kubernetes架构
### 引言

学习`kubernetes`的架构及工作流程，使用`Deployment`管理`Pod`生命周期，实现服务不中断的滚动更新，通过服务发现来实现集群内部的服务间访问，并通过`ingress-nginx`实现外部使用域名访问集群内部的服务。

目标让`Django demo`项目可以运行在`k8s`集群中，可以使用域名进行服务的访问。

- 理解架构及核心组件
- 使用`kubeadm`快速搭建集群
- 运行第一个`Pod`应用
- `Pod`进阶
- `Pod`控制器的使用
- 实现服务与`Node`绑定的几种方式
- 负载均衡与服务发现
- 使用`Ingress`实现集群服务的7层代理
- `Django`项目k8s落地实践：[网页链接](/forward/3ea5fff1.html)
- 基于ELK实现`kubernetes`集群的日志平台可参考：[网页链接](/forward/47eea66c.html)
- 集群认证与授权

### 纯容器模式的问题

1. 业务容器数量庞大，哪些容器部署在哪些节点，使用了哪些端口，如何记录、管理，需要登录到每台机器去管理？
2. 跨主机通信，多个机器中的容器之间相互调用如何做，`iptables`规则手动维护？
3. 跨主机容器间互相调用，配置如何写？写死固定`IP+端口`？
4. 如何实现业务高可用？多个容器对外提供服务如何实现负载均衡？
5. 容器的业务中断了，如何可以感知到，感知到以后，如何自动启动新的容器?
6. 如何实现滚动升级保证业务的连续性？
7. ......

### 容器调度管理平台

- Docker Swarm
- Mesos
- Google Kubernetes


2017 年开始[Kubernetes]( https://kubernetes.io/ )凭借强大的容器集群管理功能, 逐步占据市场,目前在容器编排领域一枝独秀

## kubernetes 介绍 

kubernetes，简称 K8s，是用 8 代替 8 个字符“ubernete”而成的缩写。是一个开源 的，用于管理云平台中多个主机上的容器化的应用，Kubernetes 的目标是让部署容器化的 应用简单并且高效（powerful）,Kubernetes 提供了应用部署，规划，更新，维护的一种 机制。

传统的应用部署方式是通过插件或脚本来安装应用。这样做的缺点是应用的运行、配 置、管理、所有生存周期将与当前操作系统绑定，这样做并不利于应用的升级更新/回滚等 操作，当然也可以通过创建虚拟机的方式来实现某些功能，但是虚拟机非常重，并不利于可移植性。 

新的方式是通过部署容器方式实现，每个容器之间互相隔离，每个容器有自己的文件 系统 ，容器之间进程不会相互影响，能区分计算资源。相对于虚拟机，<u>容器能快速部署， 由于容器与底层设施、机器文件系统解耦的，所以它能在不同云、不同版本操作系统间进 行迁移</u>。 

容器占用资源少、部署快，每个应用可以被打包成一个容器镜像，每个应用与容器间 成一对一关系也使容器有更大优势，使用容器可以在 build 或 release 的阶段，为应用创 建容器镜像，因为每个应用不需要与其余的应用堆栈组合，也不依赖于生产环境基础结构， 这使得从研发到测试、生产能提供一致环境。类似地，容器比虚拟机轻量、更“透明”， 这更便于监控和管理。 

Kubernetes 是 <u>Google 开源的一个容器编排引擎，它支持自动化部署、大规模可伸缩、 应用容器化管理。</u>在生产环境中部署一个应用程序时，通常要部署该应用的多个实例以便 对应用请求进行负载均衡。 

在 Kubernetes 中，我们可以创建多个容器，每个容器里面运行一个应用实例，然后通 过内置的负载均衡策略，实现对这一组应用实例的管理、发现、访问，而这些细节都不需要运维人员去进行复杂的手工配置和处理。

## kubernetes 功能

- 自动装箱（基于容器对应用运行环境的资源配置要求自动部署应用容器）
- 自我修复（
  - 当容器失败时，会对容器进行重启
  - 当所部署的 Node 节点有问题时，会对容器进行重新部署和重新调度
  - 当容器未通过监控检查时，会关闭此容器直到容器正常运行时，才会对外提供服务）
- 水平扩展（通过简单的命令、用户 UI 界面或基于 CPU 等资源使用情况，对应用容器进行规模扩大 或规模剪裁）
- 服务发现（用户不需使用额外的服务发现机制，就能够基于 Kubernetes 自身能力实现服务发现和 负载均衡）
- 滚动更新（根据应用的变化，对应用容器运行的应用，进行一次性或批量式更新）
- 版本回退（根据应用部署情况，对应用容器运行的应用，进行历史版本即时回退）
- 密钥和配置管理（在不需要重新构建镜像的情况下，可以部署和更新密钥和应用配置，类似热部署。）
- 存储编排（自动实现存储系统挂载及应用，特别对有状态应用实现数据持久化非常重要 存储系统可以来自于本地目录、网络存储(NFS、Gluster、Ceph 等)、公共云存储服务）
- 批处理（提供一次性任务，定时任务；满足批量数据处理和分析的场景）

### 架构图

区分组件与资源
![k8s架构](/images/pasted-37.png)

### 控制组件（中央）

控制平面的组件做出有关群集的全局决策（例如，调度），以及检测和响应群集事件。

控制平面组件可以在群集中的任何计算机上运行。为简单起见，设置脚本通常在同一台计算机上启动所有控制平面组件，并且不在该计算机上运行用户容器。

- `kubectl`: 命令行接口，用于对 Kubernetes 集群运行命令 [文档链接](https://kubernetes.io/zh/docs/reference/kubectl/) 
- `kube-apiserver` 提供了资源操作的唯一入口，并提供认证、授权、访问控制、API注册和发现等机制；
- `etcd`分布式高性能键值数据库,存储整个集群的所有元数据；
- `kube-scheduler`调度器,负责把业务容器调度到最合适的Node节点；
- `kube-controller-manager`控制器管理,确保集群资源按照期望的方式运行
  - Node Controller: 负责在节点出现故障时进行通知和响应。
  - Job Controller: 监视代表一次性任务的作业对象，然后创建Pod以运行这些任务以完成任务。
  - Endpoints Controller: 填充Endpoints对象（即，加入Services＆Pods）。
  - Service Account & Token Controllers: 为新的名称空间创建默认帐户和API访问令牌。
  - Replication Controller: 保证Pod持续运行，并且在任何时候都有指定数量的Pod副本，在此基础上提供一些高级特性，比如滚动升级和弹性伸缩
  - Namespace Controller: 负责[Namespace](/forward/61316209.html#Namespace-资源隔离)命名空间的删除。
  - ResourceQuota Controller: 确保了指定的资源对象在任何时候都不会超量占用系统物理资源，避免了由于某些业务进程的设计或实现的缺陷导致整个系统运行紊乱，甚至意外宕机
  - Service Controller
  - ...等


![k8s架构](/images/pasted-38.png)

### 节点组件（地方）

- `kubelet`运行在每个节点上的主要的“节点代理”个节点上的主要的“节点代理”
  - Pod 管理：kubelet 定期从所监听的数据源获取节点上 pod/container 的期望状态（运行什么容器、运行的副本数量、网络或者存储如何配置等等），并调用对应的容器平台接口达到这个状态。
  - 容器健康检查：kubelet 创建了容器之后还要查看容器是否正常运行，如果容器运行出错，就要根据 pod 设置的重启策略进行处理。
  - 容器监控：kubelet 会监控所在节点的资源使用情况，并定时向 master 报告，资源使用数据都是通过 cAdvisor 获取的。知道整个集群所有节点的资源情况，对于 pod 的调度和正常运行至关重要。
- `kube-proxy`部署在每个Node节点上，它是实现Kubernetes Service的通信与负载均衡机制的重要组件; kube-proxy负责为Pod创建代理服务，从apiserver获取所有server信息，并根据server信息创建代理服务，实现server到Pod的请求路由和转发，从而实现K8s层级的虚拟转发网络。
- CNI实现: 通用网络接口, 我们使用flannel来作为k8s集群的网络插件, 实现跨节点通信
- ...等

### 大致工作流程
![k8s工作过程](/images/pasted-39.png)
1. 用户准备一个资源文件（记录了业务应用的名称、镜像地址等信息），通过调用APIServer执行创建[Pod](https://kubernetes.io/zh/docs/concepts/workloads/pods/)
2. APIServer收到用户的Pod创建请求，将Pod信息写入到etcd中
3. 调度器通过list-watch的方式，发现有新的pod数据，但是这个pod还没有绑定到某一个节点(Node)中
4. 调度器通过调度算法，计算出最适合该pod运行的节点(Node)，并调用APIServer，把信息更新到etcd中
5. kubelet同样通过list-watch方式，发现有新的pod调度到本机的节点了，因此调用容器运行时，去根据pod的描述信息，拉取镜像，启动容器，同时生成事件信息
6. 同时，把容器的信息、事件及状态也通过APIServer写入到etcd中

**翻译：**
1. 老板提需求(创建Pod)。
2. 助理(kube-apiserver)收到指令并发布任务并将任务置为待完成(写入etcd)。
3. 技术总监(kube-scheduler)将任务分配给最合适的部门(Node)做。
4. 技术总监(kube-scheduler)将任务分配好了，反馈给老板助理更新任务状态为已分配(写入etcd)。
5. 部门经理(kubelet)再次跟老板助理(kube-apiserver)确认需求细节
6. 部门经理(kubelet)安排员工(调用容器)完成需求，并将结果直接汇报给老板助理(kube-apiserver)，老板助理将任务状态更新为已完成(写入etcd)

**注意：**只有APIServer才有能更新数据

## 部署Kubernetes（kubeadm方式）
### 节点规划

部署k8s集群的节点按照用途可以划分为如下2类角色：
- **master**：集群的master节点，集群的初始化节点，基础配置不低于2C4G
- **slave**：集群的slave节点，可以多台，基础配置不低于2C4G
**本例会演示slave节点的添加，会部署一台master+2台slave**，节点规划如下：

|主机名       |    节点ip    |  角色  |   部署组件                           |
|:----------:|:-----------:|:-----:|:-----------------------------------------: |
| k8s-master | 192.168.56.10 | master | etcd, kube-apiserver, kube-controller-manager, kubectl, kubeadm, kubelet, kube-proxy, flannel |
| k8s-slave1 | 192.168.56.20 | slave  |kubectl, kubelet, kube-proxy, flannel    |
| k8s-slave2 | 192.168.56.30 | slave  |kubectl, kubelet, kube-proxy, flannel    |

### 组件版本

|   组件    |               版本             |    说明                              |
|:--------:|:------------------------------:|:----------------------------------- |
|  CentOS  |        7.9.2009 (Core)         |                                     |
|  Kernel  |3.10.0-1160.24.1.el7.x86_64     |                                     |
|   etcd   |             3.3.15             | 使用容器方式部署，默认数据挂载到本地路径   |
|  coredns |            1.6.2               |                                     |
|  kubeadm |           v1.16.2              |                                     |
|  kubectl |           v1.16.2              |                                     |
|  kubelet |           v1.16.2              |                                     |
|kube-proxy|           v1.16.2              |                                     |
|  flannel |           v0.11.0              |                                     |

### 准备工作
#### 设置hosts解析
操作节点：所有节点（`k8s-master，k8s-slave`）均需执行

- **修改hostname**
  hostname必须只能包含小写字母、数字、","、"-"，且开头结尾必须是小写字母或数字

``` bash
# 在master节点
$ hostnamectl set-hostname k8s-master #设置master节点的hostname
$ bash

# 在slave-1节点
$ hostnamectl set-hostname k8s-slave1 #设置slave1节点的hostname
$ bash

# 在slave-2节点
$ hostnamectl set-hostname k8s-slave2 #设置slave2节点的hostname
$ bash
```
- **添加hosts解析**

``` bash
$ cat >>/etc/hosts<<EOF
192.168.56.10 k8s-master
192.168.56.20 k8s-slave1
192.168.56.30 k8s-slave2
EOF
```

#### 调整系统配置

操作节点： 所有的master和slave节点（`k8s-master,k8s-slave`）需要执行
>下述操作均以k8s-master为例，其他节点均是相同的操作（ip和hostname的值换成对应机器的真实值）

- **设置安全组开放端口**

如果节点间无安全组限制（内网机器间可以任意访问），可以忽略，否则，至少保证如下端口可通：
k8s-master节点：TCP：6443，2379，2380，60080，60081，UDP协议端口全部打开
k8s-slave节点：UDP协议端口全部打开

- **设置iptables**

``` bash
iptables -P FORWARD ACCEPT
```

- **关闭swap**

``` bash
swapoff -a
# 防止开机自动挂载 swap 分区
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

- **关闭selinux和防火墙**

``` bash
sed -ri 's#(SELINUX=).*#\1disabled#' /etc/selinux/config
setenforce 0
systemctl disable firewalld && systemctl stop firewalld
```

- **修改内核参数**

``` bash
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward=1
vm.max_map_count=262144
EOF
modprobe br_netfilter
sysctl -p /etc/sysctl.d/k8s.conf
```

- **设置yum源**

``` bash
$ curl -o /etc/yum.repos.d/Centos-7.repo http://mirrors.aliyun.com/repo/Centos-7.repo
$ curl -o /etc/yum.repos.d/docker-ce.repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
$ cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
        http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
$ yum clean all && yum makecache
```
#### 安装docker
操作节点： 所有节点
```bash
## 查看所有的可用版本
$ yum list docker-ce --showduplicates | sort -r
##安装旧版本 yum install docker-ce-cli-18.09.9-3.el7  docker-ce-18.09.9-3.el7
## 安装源里最新版本
$ yum install docker-ce

## 配置docker加速
$ mkdir -p /etc/docker
vi /etc/docker/daemon.json
{
  "insecure-registries": [    
    "192.168.56.10:5000" 
  ],                          
  "registry-mirrors" : [
    "https://8xpk5wnt.mirror.aliyuncs.com"
  ]
}
## 启动docker
$ systemctl enable --now docker
```
### 部署kubernetes（kubeadm方式）

#### 安装 kubeadm, kubelet, kubectl
操作节点： 所有的master和slave节点(`k8s-master,k8s-slave`) 需要执行
```bash
## 指定源安装
$ yum install -y kubelet-1.16.2 kubeadm-1.16.2 kubectl-1.16.2 --disableexcludes=kubernetes
## 查看kubeadm 版本
$ kubeadm version
## 设置kubelet开机启动
$ systemctl enable kubelet 
```
#### 初始化配置文件
操作节点： 只在master节点（`k8s-master`）执行
```bash
$ kubeadm config print init-defaults > kubeadm.yaml
$ cat kubeadm.yaml
apiVersion: kubeadm.k8s.io/v1beta2
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.56.10  # apiserver地址，因为单master，所以配置master的节点内网IP。高可用配置LB
  bindPort: 6443
nodeRegistration:
  criSocket: /var/run/dockershim.sock
  name: k8s-master
  taints:
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta2
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns:
  type: CoreDNS
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.aliyuncs.com/google_containers  # 修改成阿里镜像源
kind: ClusterConfiguration
kubernetesVersion: v1.16.2
networking:
  dnsDomain: cluster.local
  podSubnet: 10.244.0.0/16  # Pod 网段，flannel插件需要使用这个网段
  serviceSubnet: 10.96.0.0/12
scheduler: {}
```
>对于上面的资源清单的文档比较杂，要想完整了解上面的资源对象对应的属性，可以查看对应的 godoc 文档，地址: https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2。 

#### 提前下载镜像

操作节点：只在master节点（`k8s-master`）执行，带*号要在所有节点执行

``` bash
# 查看需要使用的镜像列表,若无问题，将得到如下列表
$ kubeadm config images list --config kubeadm.yaml
registry.aliyuncs.com/google_containers/kube-apiserver:v1.16.0
registry.aliyuncs.com/google_containers/kube-controller-manager:v1.16.0
registry.aliyuncs.com/google_containers/kube-scheduler:v1.16.0
registry.aliyuncs.com/google_containers/kube-proxy:v1.16.0 *
registry.aliyuncs.com/google_containers/pause:3.1 *
registry.aliyuncs.com/google_containers/etcd:3.3.15-0
registry.aliyuncs.com/google_containers/coredns:1.6.2
# 提前下载镜像到本地
$ kubeadm config images pull --config kubeadm.yaml
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-apiserver:v1.16.0
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-controller-manager:v1.16.0
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-scheduler:v1.16.0
[config/images] Pulled registry.aliyuncs.com/google_containers/kube-proxy:v1.16.0
[config/images] Pulled registry.aliyuncs.com/google_containers/pause:3.1
[config/images] Pulled registry.aliyuncs.com/google_containers/etcd:3.3.15-0
[config/images] Pulled registry.aliyuncs.com/google_containers/coredns:1.6.2
```

注意如果出现不可用的情况，请使用如下方式来代替：
1. 还原kubeadm.yaml的imageRepository

```yaml
...
imageRepository: k8s.gcr.io
...

## 查看使用的镜像源
kubeadm config images list --config kubeadm.yaml
k8s.gcr.io/kube-apiserver:v1.16.0
k8s.gcr.io/kube-controller-manager:v1.16.0
k8s.gcr.io/kube-scheduler:v1.16.0
k8s.gcr.io/kube-proxy:v1.16.0
k8s.gcr.io/pause:3.1
k8s.gcr.io/etcd:3.3.15-0
k8s.gcr.io/coredns:1.6.2
```

2. 使用docker hub中的镜像源来下载，注意上述列表中要加上处理器架构，通常我们使用的虚拟机都是amd64

```bash
$ docker pull mirrorgooglecontainers/kube-scheduler-amd64:v1.16.0
$ docker pull mirrorgooglecontainers/etcd-amd64:3.3.15-0
$ docker pull coredns/coredns:1.6.2 
...
docker tag  b305571ca60a k8s.gcr.io/kube-apiserver:v1.16.0
docker tag  c21b0c7400f9 k8s.gcr.io/kube-proxy:v1.16.0
docker tag  06a629a7e51c k8s.gcr.io/kube-controller-manager:v1.16.0
docker tag  301ddc62b80b k8s.gcr.io/kube-scheduler:v1.16.0
docker tag  b2756210eeab  k8s.gcr.io/etcd:3.3.15-0
docker tag  bf261d157914 k8s.gcr.io/coredns:1.6.2
docker tag  da86e6ba6ca1 k8s.gcr.io/pause:3.1
```
#### 初始化master节点
操作节点：只在master节点（`k8s-master`）执行
``` bash
kubeadm init --config kubeadm.yaml
```
若初始化成功后，最后会提示如下信息：
```bash
...
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 192.168.56.10:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:2e504f40900e6e0708adbffb526b9084a48ac93719c09469ca7d58ac6f5dda01 
```
接下来按照上述提示信息操作，配置kubectl客户端的认证

``` bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

> **⚠️注意：**此时使用 kubectl get nodes查看节点应该处于notReady状态，因为还未配置网络插件
>
> 若执行初始化过程中出错，根据错误信息调整后，执行kubeadm reset后再次执行init操作即可

#### 添加slave节点到集群中

操作节点：所有的slave节点（`k8s-slave`）需要执行
在每台slave节点，执行如下命令，该命令是在kubeadm init成功后提示信息中打印出来的，需要替换成实际init后打印出的命令。
```bash
kubeadm join 192.168.56.10:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:2e504f40900e6e0708adbffb526b9084a48ac93719c09469ca7d58ac6f5dda01 

## master验证
[root@k8s-master ~]# kubectl get node
NAME         STATUS     ROLES    AGE     VERSION
k8s-master   NotReady   master   6m10s   v1.16.2
k8s-slave1   NotReady   <none>   60s     v1.16.2
k8s-slave2   NotReady   <none>   62s     v1.16.2

## slave验证
[root@k8s-slave1 ~]# journalctl -fu kubelet
4月 26 00:19:07 k8s-slave1 kubelet[1976]: E0426 00:19:07.399992    1976 kubelet.go:2187] Container runtime network not read
y: NetworkReady=false reason:NetworkPluginNotReady message:docker: network plugin is not ready: cni config uninitialized
^C

[root@k8s-slave2 ~]# journalctl -fu kubelet
4月 26 00:19:00 k8s-slave2 kubelet[2247]: E0426 00:19:00.397872    2247 kubelet.go:2187] Container runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:docker: network plugin is not ready: cni config uninitialized
^C
```

#### 安装flannel插件

操作节点：只在master节点（`k8s-master`）执行
- 下载flannel的yaml文件

```bash
wget https://raw.githubusercontent.com/coreos/flannel/2140ac876ef134e0ed5af15c65e414cf26827915/Documentation/kube-flannel.yml
```
- 修改配置，指定网卡名称，大概在文件的和170行，190行，添加一行配置：

```bash
$ vi kube-flannel.yml
...            
      initContainers:
      - name: install-cni
        image: 192.168.56.10:5000/coreos/flannel:v0.11.0-amd64
        command:
        - cp
        args:
        - -f
        - /etc/kube-flannel/cni-conf.json
        - /etc/cni/net.d/10-flannel.conflist
        volumeMounts:
        - name: cni
          mountPath: /etc/cni/net.d
        - name: flannel-cfg
          mountPath: /etc/kube-flannel/
      containers:
      - name: kube-flannel
        image: 192.168.56.10:5000/coreos/flannel:v0.11.0-amd64
        command:
        - /opt/bin/flanneld
        args:
        - --ip-masq
        - --kube-subnet-mgr
        - --iface=enp0s8 # 如果机器存在多网卡的话，指定内网网卡的名称，默认不指定的话会找第一块网
        resources:
          requests:
            cpu: "100m"
...
```

- 执行安装flannel网络插件

```bash
# 先拉取镜像,此过程国内速度比较慢
$ docker pull quay.io/coreos/flannel:v0.11.0-amd64
# 执行flannel安装
$ kubectl create -f kube-flannel.yml


kubectl -n kube-system get po -o wide #检查状态
kubectl delete -f kube-flannel.yml #删除
```

#### master节点是否可调度（可选）

操作节点：`k8s-master`

默认部署成功后，master节点无法调度业务pod，如需设置master节点也可以参与pod的调度，需执行：

``` bash
$ kubectl taint node k8s-master node-role.kubernetes.io/master:NoSchedule-
```

#### 验证集群

操作节点： 在master节点（`k8s-master`）执行

``` bash
$ kubectl get nodes  #观察集群节点是否全部Ready
NAME         STATUS   ROLES    AGE   VERSION
k8s-master   Ready    master   56m   v1.16.2
k8s-slave1   Ready    <none>   50m   v1.16.2
k8s-slave2   Ready    <none>   50m   v1.16.2
```

创建测试nginx服务

``` bash
$ kubectl run  test-nginx --image=nginx:alpine
```
查看pod是否创建成功，并访问pod ip测试是否可用

``` bash
$ kubectl get po -o wide
NAME                          READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
test-nginx-5bd8859b98-pvgv4   1/1     Running   0          9s    10.244.1.2   k8s-slave2   <none>           <none>
[root@k8s-master ~]# curl 10.244.1.2
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

#### 部署dashboard

- **部署服务**

```bash
# 推荐使用下面这种方式
$ wget https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-beta5/aio/deploy/recommended.yaml
$ vi recommended.yaml
# 修改Service为NodePort类型
......
kind: Service
apiVersion: v1
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  ports:
    - port: 443
      targetPort: 8443
  selector:
    k8s-app: kubernetes-dashboard
  type: NodePort  # 加上type=NodePort变成NodePort类型的服务
......
```
- **修改镜像地址：**
  - dashboard:v2.0.0-beta5
  - metrics-scraper:v1.0.1

- **查看访问地址，本例为30133端口**

```bash
[root@k8s-master ~]# kubectl create -f recommended.yaml
[root@k8s-master ~]# kubectl get ns
NAME                   STATUS   AGE
default                Active   69m
kube-node-lease        Active   69m
kube-public            Active   69m
kube-system            Active   69m
kubernetes-dashboard   Active   50s

[root@k8s-master ~]# kubectl -n kubernetes-dashboard get svc
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)         AGE
dashboard-metrics-scraper   ClusterIP   10.103.137.107   <none>        8000/TCP        116s
kubernetes-dashboard        NodePort    10.100.204.135   <none>        443:31835/TCP   116s

[root@k8s-master ~]# kubectl -n kubernetes-dashboard get pod
NAME                                         READY   STATUS    RESTARTS   AGE
dashboard-metrics-scraper-8477788997-5l27q   1/1     Running   0          2m17s
kubernetes-dashboard-5f468cc868-svbbq        1/1     Running   0          2m17s
```

![k8s install](/images/pasted-40.png)

**Google浏览器出现：**您目前无法访问 `XX.XX.XX.XX`，因为此网站发送了 Google Chrome 无法处理的杂乱凭据
在Chrome该页面上鼠标点击当前页面任意位置，直接键盘输入这11个字符：`thisisunsafe`（输入时是不显示任何字符的）

- **创建ServiceAccount进行访问**

```bash
vi admin.conf
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: admin
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: admin
  namespace: kubernetes-dashboard

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin
  namespace: kubernetes-dashboard

[root@k8s-master ~]# kubectl create -f admin.conf
clusterrolebinding.rbac.authorization.k8s.io/admin created
serviceaccount/admin created

kubectl -n kubernetes-dashboard get secret |grep admin-token

[root@k8s-master ~]# kubectl -n kubernetes-dashboard describe secret admin-token-w8nv5
Name:         admin-token-w8nv5
Namespace:    kubernetes-dashboard
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: admin
              kubernetes.io/service-account.uid: a7e764ad-45c4-474e-acff-fb3f9dd4243a

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1025 bytes
namespace:  20 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6ImU0LTd4NWJnZG1CNHhEWXdVRXpUclpCc08zNmtSWkZhVWp4bW5YaDFtQ1EifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJhZG1pbi10b2tlbi13OG52NSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50Lm5hbWUiOiJhZG1pbiIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImE3ZTc2NGFkLTQ1YzQtNDc0ZS1hY2ZmLWZiM2Y5ZGQ0MjQzYSIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDprdWJlcm5ldGVzLWRhc2hib2FyZDphZG1pbiJ9.GVt0KeNQv8CR3_VIYEgApw-GYQ_celnS4Zop-SBVyfqsQCTVZU992DsATCyFmH1I-Wys8EooqciPD1aGxu6SLkPnb_JJdNPHotHvBYleDUEqt4k0YOQW2mnAHuT2I2nbaAopsyojfg_ur94cpPDNkZH9wQAnQH5bkqS63-KqkrOh-3GXf0yd1Kva-WFJEqMj_BBYjbOfYxR655HD4NnFPGLmPHNvSmXZsGA1Zlq--tys6kLFPDLozK1lR4l69f5PaznVTHkqKQBFmNQ8QLyXP6bKO6TxQBeltW51DS47_W4nso5vU8zPgNbFzaNSiGEM2PmdBQ7IE3aUjPgJICw0CA
```

![k8s install](/images/pasted-41.png)

![k8s install](/images/pasted-42.png)

好的开始是成功的一半，到此k8s集群kubeadm方式安装成功！
## 部署kubernetes（二进制包方式）
### 节点规划

| 主机名      | 节点ip          | 角色   | 部署组件                                                     |
| ----------- | --------------- | ------ | ------------------------------------------------------------ |
| k8s-node001 | 192.168.56.10    | master | kube-apiserver，kube-controller-manager，kube -scheduler，etcd |
| k8s-node002 | 192.168.56.20 | slave  | kubelet，kube-proxy，docker， etcd                           |
| k8s-node003 | 192.168.56.30 | slave  | kubelet，kube-proxy，docker，etcd                            |

### 组件版本

| 组件       | 版本                        |
| ---------- | --------------------------- |
| CentOS     | 7.9.2009 (Core)             |
| Kernel     | 3.10.0-1160.24.1.el7.x86_64 |
| etcd       | v3.4.9                      |
| coredns    | 1.6.2                       |
| kubectl    | v1.18.12                     |
| kubelet    | v1.18.12                     |
| kube-proxy | v1.18.12                     |
| flannel    | v0.14.0                     |

### 准备工作

```bash
# 关闭防火墙 
systemctl stop firewalld 
systemctl disable firewalld

# 关闭 selinux
sed -i 's/enforcing/disabled/' /etc/selinux/config # 永久
setenforce 0 # 临时

# 关闭 swap
swapoff -a # 临时
sed -ri 's/.*swap.*/#&/' /etc/fstab # 永久

# 根据规划设置主机名
hostnamectl set-hostname <hostname>

# 在 master 添加 hosts
cat >> /etc/hosts << EOF
192.168.56.10 k8s-node001
192.168.56.20 k8s-node002
192.168.56.30 k8s-node003
EOF

# 将桥接的 IPv4 流量传递到 iptables 的链
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward=1
vm.max_map_count=262144
EOF
modprobe br_netfilter
sysctl -p /etc/sysctl.d/k8s.conf

# ipvs相关配置
cat > /etc/sysconfig/modules/ipvs.modules << EOF
#!/bin/bash
modprobe -- ip_vs
modprobe -- ip_vs_sh
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- nf_conntrack_ipv4
EOF

chmod +x /etc/sysconfig/modules/ipvs.modules
source /etc/sysconfig/modules/ipvs.modules
```

### 部署 Etcd 集群 

Etcd 是一个分布式键值存储系统，Kubernetes 使用 Etcd 进行数据存储，所以先准备 一个 Etcd 数据库，为解决 Etcd 单点故障，应采用集群方式部署，这里使用 3 台组建集 群，可容忍 1 台机器故障，当然，也可以使用 5 台组建集群，可容忍 2 台机器故障。

| 主机名      | 节点ip          |
| ----------- | --------------|
| etcd-1 | 192.168.56.10 |
| etcd-2 | 192.168.56.20 |
| etcd-3 | 192.168.56.30 |

> 注：为了节省机器，这里与 K8s 节点机器复用。也可以独立于 k8s 集群之外部署，只要 apiserver 能连接到就行。

#### 生成cfssl证书

准备 cfssl 证书生成工具 cfssl 是一个开源的证书管理工具，使用 json 文件生成证书，相比 openssl 更方便使用。 找任意一台服务器操作，这里用 Master 节点。

```bash
[root@k8s-node001 ~]# mkdir tls
[root@k8s-node001 ~]# cd tls
wget https://pkg.cfssl.org/R1.2/cfssl_linux-amd64
wget https://pkg.cfssl.org/R1.2/cfssljson_linux-amd64
wget https://pkg.cfssl.org/R1.2/cfssl-certinfo_linux-amd64
chmod +x cfssl_linux-amd64 cfssljson_linux-amd64 cfssl-certinfo_linux-amd64
mv cfssl_linux-amd64 /usr/local/bin/cfssl
mv cfssljson_linux-amd64 /usr/local/bin/cfssljson
mv cfssl-certinfo_linux-amd64 /usr/bin/cfssl-certinfo
```

#### 生成 etcd 证书 

自签证书颁发机构（CA） 创建工作目录：

```bash
mkdir {etcd,k8s} && cd etcd
cat > ca-config.json << EOF
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "www": {
         "expiry": "87600h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}
EOF

cat > ca-csr.json << EOF
{
    "CN": "etcd CA",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Shanghai",
            "ST": "Shanghai"
        }
    ]
}
EOF

生成证书：
cfssl gencert -initca ca-csr.json | cfssljson -bare ca -

[root@k8s-node001 etcd]# ll *.pem
-rw------- 1 root root 1679 5月  25 17:31 ca-key.pem
-rw-r--r-- 1 root root 1273 5月  25 17:31 ca.pem
```

#### 签发 etcd 证书

创建证书申请文件

```bash
cat > server-csr.json << EOF
{
    "CN": "etcd",
    "hosts": [
    "192.168.56.10",
    "192.168.56.20",
    "192.168.56.30"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Shanghai",
            "ST": "Shanghai"
        }
    ]
}
EOF
```

> 注：上述文件 hosts 字段中 IP 为所有 etcd 节点的集群内部通信 IP，一个都不能少！为了 方便后期扩容可以多写几个预留的 IP。

#### 生成证书

```bash
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=www server-csr.json | cfssljson -bare server

[root@k8s-node001 etcd]# ls server*pem
server-key.pem  server.pem
```



#### 下载etcd二进制包

下载地址：`https://github.com/etcd-io/etcd/releases/download/v3.4.9/etcd-v3.4.9-linux-amd64.tar.gz`

#### 部署 etcd 集群

```bash
tar -xf etcd-v3.4.9-linux-amd64.tar.gz -C /opt/ && mv /opt/etcd-v3.4.9-linux-amd64/ /opt/etcd

mkdir /opt/etcd/{bin,cfg,ssl,data}

mv /opt/etcd/{etcd,etcdctl} /opt/etcd/bin/

rm -rf /opt/etcd/ssl/* && cp /root/tls/etcd/{ca.pem,server.pem,server-key.pem} /opt/etcd/ssl/
ll /opt/etcd/ssl/
总用量 12
-rw-r--r--. 1 root root 1273 5月  25 21:21 ca.pem
-rw-------. 1 root root 1679 5月  25 21:21 server-key.pem
-rw-r--r--. 1 root root 1342 5月  25 21:21 server.pem
```

#### 配置etcd

```bash
cat > /opt/etcd/cfg/etcd.conf <<'EOF'
#[Member]
ETCD_NAME="etcd-1"
ETCD_DATA_DIR="/opt/etcd/data/default.etcd"
ETCD_LISTEN_PEER_URLS="https://192.168.56.10:2380"
ETCD_LISTEN_CLIENT_URLS="https://192.168.56.10:2379"
#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://192.168.56.10:2380"
ETCD_ADVERTISE_CLIENT_URLS="https://192.168.56.10:2379"
ETCD_INITIAL_CLUSTER="etcd-1=https://192.168.56.10:2380,etcd-2=https://192.168.56.20:2380,etcd-3=https://192.168.56.30:2380"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
EOF
# ETCD_NAME：节点名称，集群中唯一
# ETCD_DATA_DIR：数据目录
# ETCD_LISTEN_PEER_URLS：集群通信监听地址
# ETCD_LISTEN_CLIENT_URLS：客户端访问监听地址
# ETCD_INITIAL_ADVERTISE_PEER_URLS：集群通告地址
# ETCD_ADVERTISE_CLIENT_URLS：客户端通告地址
# ETCD_INITIAL_CLUSTER：集群节点地址
# ETCD_INITIAL_CLUSTER_TOKEN：集群Token
# ETCD_INITIAL_CLUSTER_STATE：加入集群的当前状态，new是新集群，existing表示加入已有集群
```

#### 添加systemd管理脚本

```bash
cat > /usr/lib/systemd/system/etcd.service << EOF
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target
[Service]
Type=notify
EnvironmentFile=/opt/etcd/cfg/etcd.conf
ExecStart=/opt/etcd/bin/etcd \
--cert-file=/opt/etcd/ssl/server.pem \
--key-file=/opt/etcd/ssl/server-key.pem \
--peer-cert-file=/opt/etcd/ssl/server.pem \
--peer-key-file=/opt/etcd/ssl/server-key.pem \
--trusted-ca-file=/opt/etcd/ssl/ca.pem \
--peer-trusted-ca-file=/opt/etcd/ssl/ca.pem \
--logger=zap
Restart=on-failure
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF
```



```bash
#推送配置
rsync -avz /opt/etcd k8s-node002:/opt/
rsync -avz /opt/etcd k8s-node003:/opt/

#各节点修改配置
ETCD_NAME="etcd-1" #此处

ETCD_LISTEN_PEER_URLS="https://192.168.1.55:2380" #此处
ETCD_LISTEN_CLIENT_URLS="https://192.168.1.55:2379" #此处

ETCD_INITIAL_ADVERTISE_PEER_URLS="https://192.168.1.55:2380" #此处
ETCD_ADVERTISE_CLIENT_URLS="https://192.168.1.55:2379" #此处
```

启动并开机自启[所有节点执行]

```bash
systemctl daemon-reload
systemctl enable --now etcd
```

验证集群状态
```bash
/opt/etcd/bin/etcdctl --cacert=/opt/etcd/ssl/ca.pem --cert=/opt/etcd/ssl/server.pem --key=/opt/etcd/ssl/server-key.pem --endpoints="https://192.168.56.10:2379,https://192.168.56.20:2379,https://192.168.56.30:2379" endpoint health

https://192.168.56.10:2379 is healthy: successfully committed proposal: took = 17.691408ms
https://192.168.56.20:2379 is healthy: successfully committed proposal: took = 20.327118ms
https://192.168.56.30:2379 is healthy: successfully committed proposal: took = 22.23013ms
```
> 出现上面提示信息就说明集群已经构建成功，如果有问题第一步先看日志：/var/log/message 或 journalctl -u etcd

### 部署Master Node
#### 生成自签CA证书

创建证书申请文件
```bash
cd tls/k8s/
cat > ca-config.json << 'EOF'
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "kubernetes": {
         "expiry": "87600h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}
EOF

cat > ca-csr.json << 'EOF'
{
    "CN": "kubernetes",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Shanghai",
            "ST": "Shanghai",
            "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF

生成证书
cfssl gencert -initca ca-csr.json | cfssljson -bare ca -

[root@k8s-node001 k8s]# ls *pem
ca-key.pem  ca.pem
```
#### 签发apiserver证书
```bash
cat > server-csr.json << 'EOF'
{
    "CN": "kubernetes",
    "hosts": [
      "10.0.0.1",
      "127.0.0.1",
      "192.168.56.10",
      "192.168.56.20",
      "192.168.56.30",
      "192.168.56.40",
      "192.168.56.50",
      "kubernetes",
      "kubernetes.default",
      "kubernetes.default.svc",
      "kubernetes.default.svc.cluster",
      "kubernetes.default.svc.cluster.local"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing",
            "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF
```
>hosts字段中IP为所有Master/LB/VIP IP/所有节点公网IP等，一个都不能少！为了方便后期扩容可以多写几个预留的IP。

签发
```bash
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes server-csr.json | cfssljson -bare server

[root@k8s-node001 k8s]# ls *pem
ca-key.pem  ca.pem  server-key.pem  server.pem
```

#### 部署apiserver
下载二进制包:[https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.18.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.18.md)
>注：打开链接你会发现里面有很多包，下载一个 server 包就够了，包含了 Master 和 Worker Node 二进制文件。

```bash
wget https://dl.k8s.io/v1.18.12/kubernetes-server-linux-amd64.tar.gz
tar -xf kubernetes-server-linux-amd64.tar.gz

mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs}
cp kubernetes/server/bin/{kube-apiserver,kube-scheduler,kube-controller-manager,kubectl} /opt/kubernetes/bin/

[root@k8s-node001 ~]# ll /opt/kubernetes/bin/
总用量 267376
-rwxr-xr-x. 1 root root 120700928 5月  25 22:49 kube-apiserver
-rwxr-xr-x. 1 root root 110120960 5月  25 22:49 kube-controller-manager
-rwxr-xr-x. 1 root root  42971136 5月  25 22:49 kube-scheduler
```
配置apiserver
```bash
cat > /opt/kubernetes/cfg/kube-apiserver.conf << 'EOF'
KUBE_APISERVER_OPTS="--logtostderr=false \
--v=2 \
--log-dir=/opt/kubernetes/logs \
--etcd-servers=https://192.168.56.10:2379,https://192.168.56.20:2379,https://192.168.56.30:2379 \
--bind-address=192.168.56.10 \
--secure-port=6443 \
--advertise-address=192.168.56.10 \
--allow-privileged=true \
--service-cluster-ip-range=10.0.0.0/24 \
--enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction \
--authorization-mode=RBAC,Node \
--enable-bootstrap-token-auth=true \
--token-auth-file=/opt/kubernetes/cfg/token.csv \
--service-node-port-range=30000-32767 \
--kubelet-client-certificate=/opt/kubernetes/ssl/server.pem \
--kubelet-client-key=/opt/kubernetes/ssl/server-key.pem \
--tls-cert-file=/opt/kubernetes/ssl/server.pem  \
--tls-private-key-file=/opt/kubernetes/ssl/server-key.pem \
--client-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-key-file=/opt/kubernetes/ssl/ca-key.pem \
--etcd-cafile=/opt/etcd/ssl/ca.pem \
--etcd-certfile=/opt/etcd/ssl/server.pem \
--etcd-keyfile=/opt/etcd/ssl/server-key.pem \
--audit-log-maxage=30 \
--audit-log-maxbackup=3 \
--audit-log-maxsize=100 \
--audit-log-path=/opt/kubernetes/logs/k8s-audit.log"
EOF

# –logtostderr：启用日志
# —v：日志等级
# –log-dir：日志目录
# –etcd-servers：etcd集群地址
# –bind-address：监听地址
# –secure-port：https安全端口
# –advertise-address：集群通告地址
# –allow-privileged：启用授权
# –service-cluster-ip-range：Service虚拟IP地址段
# –enable-admission-plugins：准入控制模块
# –authorization-mode：认证授权，启用RBAC授权和节点自管理
# –enable-bootstrap-token-auth：启用TLS bootstrap机制
# –token-auth-file：bootstrap token文件
# –service-node-port-range：Service nodeport类型默认分配端口范围
# –kubelet-client-xxx：apiserver访问kubelet客户端证书
# –tls-xxx-file：apiserver https证书
# –etcd-xxxfile：连接Etcd集群证书
# –audit-log-xxx：审计日志

创建上述配置文件中 token 文件：
cat > /opt/kubernetes/cfg/token.csv << EOF
c47ffb939f5ca36231d9e3121a252940,kubelet-bootstrap,10001,"system:nodebootstrapper"
EOF
格式：token，用户名，UID，用户组
token 也可自行生成替换：
head -c 16 /dev/urandom | od -An -t x | tr -d ' '

systemd 管理
cat > /usr/lib/systemd/system/kube-apiserver.service << 'EOF'
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes
[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-apiserver.conf
ExecStart=/opt/kubernetes/bin/kube-apiserver $KUBE_APISERVER_OPTS
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF
```
#### 拷贝刚才生成的证书
把刚才生成的证书拷贝到配置文件中的路径：
```bash
cp ~/tls/k8s/ca*pem ~/tls/k8s/server*pem /opt/kubernetes/ssl/
```
#### 启用TLS Bootstrapping
TLS Bootstraping：Master apiserver 启用 TLS 认证后，Node 节点 kubelet 和 kube-proxy 要与 kube-apiserver 进行通信，必须使用 CA 签发的有效证书才可以，当 Node
节点很多时，这种客户端证书颁发需要大量工作，同样也会增加集群扩展复杂度。为了
简化流程，Kubernetes 引入了 TLS bootstraping 机制来自动颁发客户端证书，kubelet
会以一个低权限用户自动向 apiserver 申请证书，kubelet 的证书由 apiserver 动态签署。
所以强烈建议在 Node 上使用这种方式，目前主要用于 kubelet，kube-proxy 还是由我
们统一颁发一个证书。
TLS bootstraping 工作流程：

![TLS bootstraping](/images/pasted-53.png)

#### 授权kubelet-bootstrap用户允许请求证书*
```bash
kubectl create clusterrolebinding kubelet-bootstrap \
--clusterrole=system:node-bootstrapper \
--user=kubelet-bootstrap
```

#### 部署controller-manager
```bash
cat > /opt/kubernetes/cfg/kube-controller-manager.conf << 'EOF'
KUBE_CONTROLLER_MANAGER_OPTS="--logtostderr=false \
--v=2 \
--log-dir=/opt/kubernetes/logs \
--leader-elect=true \
--master=127.0.0.1:8080 \
--bind-address=127.0.0.1 \
--allocate-node-cidrs=true \
--cluster-cidr=10.244.0.0/16 \
--service-cluster-ip-range=10.0.0.0/24 \
--cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem \
--cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem  \
--root-ca-file=/opt/kubernetes/ssl/ca.pem \
--service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem \
--experimental-cluster-signing-duration=87600h0m0s"
EOF

systemd 管理
cat > /usr/lib/systemd/system/kube-controller-manager.service << 'EOF'
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes
[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-controller-manager.conf
ExecStart=/opt/kubernetes/bin/kube-controller-manager $KUBE_CONTROLLER_MANAGER_OPTS
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF
```

- master：通过本地非安全本地端口 8080 连接 apiserver。
- leader-elect：当该组件启动多个时，自动选举（HA）
- cluster-signing-cert-file/–cluster-signing-key-file：自动为 kubelet 颁发证书的 CA，与 apiserver 保持一致

#### 部署kube-scheduler
```bash
cat > /opt/kubernetes/cfg/kube-scheduler.conf << 'EOF'
KUBE_SCHEDULER_OPTS="--logtostderr=false \
--v=2 \
--log-dir=/opt/kubernetes/logs \
--leader-elect \
--master=127.0.0.1:8080 \
--bind-address=127.0.0.1"
EOF

systemd管理
cat > /usr/lib/systemd/system/kube-scheduler.service << 'EOF'
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes
[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-scheduler.conf
ExecStart=/opt/kubernetes/bin/kube-scheduler $KUBE_SCHEDULER_OPTS
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF
```
- master：通过本地非安全本地端口8080连接apiserver。
- leader-elect：当该组件启动多个时，自动选举（HA）

#### 启动Master组件
```bash
systemctl daemon-reload
systemctl enable --now kube-apiserver
systemctl enable --now kube-controller-manager
systemctl enable --now kube-scheduler.service

启动出错排查：cat /var/log/messages|grep kube-apiserver|grep -i error
```

#### 检查集群状态
```bash
ln -s /opt/kubernetes/bin/kubectl  /usr/bin/

[root@k8s-node001 ~]# kubectl get cs
NAME                 STATUS    MESSAGE             ERROR
controller-manager   Healthy   ok                  
scheduler            Healthy   ok                  
etcd-0               Healthy   {"health":"true"}   
etcd-1               Healthy   {"health":"true"}   
etcd-2               Healthy   {"health":"true"}
```
### 部署Worker Node
#### 安装docker

参见：[安装Docker](/forward/57e2aa11.html#%E5%AE%89%E8%A3%85docker)

#### 复制二进制包
创建工作目录并拷贝二进制文件
在所有 worker node 创建工作目录：
```bash
mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs}
```
从 master 节点拷贝：
```bash
rsync -avz ~/kubernetes-server-linux-amd64.tar.gz k8s-node002:/root/
rsync -avz ~/kubernetes-server-linux-amd64.tar.gz k8s-node003:/root/

node节点执行
tar -xf kubernetes-server-linux-amd64.tar.gz
cp kubernetes/server/bin/{kubelet,kube-proxy} /opt/kubernetes/bin/
ln -s /opt/kubernetes/bin/kubelet /usr/bin/
```

#### 部署kubelet
```bash
#
cat > /opt/kubernetes/cfg/kubelet.conf << 'EOF'
KUBELET_OPTS="--logtostderr=false \
--v=2 \
--log-dir=/opt/kubernetes/logs \
--hostname-override=k8s-node002 \
--network-plugin=cni \
--kubeconfig=/opt/kubernetes/cfg/kubelet.kubeconfig \
--bootstrap-kubeconfig=/opt/kubernetes/cfg/bootstrap.kubeconfig \
--config=/opt/kubernetes/cfg/kubelet-config.yml \
--cert-dir=/opt/kubernetes/ssl \
--pod-infra-container-image=lizhenliang/pause-amd64:3.0"
EOF
```
> 修改hostname-override=为本机节点
- hostname-override：显示名称，集群中唯一
- network-plugin：启用 CNI –kubeconfig：空路径，会自动生成，后面用于连接 apiserver -bootstrap-kubeconfig：首次启动向 apiserver 申请证书
- config：配置参数文件
- cert-dir：kubelet 证书生成目录
- pod-infra-container-image：管理 Pod 网络容器的镜像

定义kubelet配置参数文件
```bash
在node执行
cat > /opt/kubernetes/cfg/kubelet-config.yml << EOF
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
address: 0.0.0.0
port: 10250
readOnlyPort: 10255
cgroupDriver: cgroupfs
clusterDNS:
- 10.1.0.2
clusterDomain: cluster.local 
failSwapOn: false
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /opt/kubernetes/ssl/ca.pem 
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
evictionHard:
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
maxOpenFiles: 1000000
maxPods: 110
EOF
```
生成 bootstrap.kubeconfig 文件
```bash
KUBE_APISERVER="https://192.168.56.10:6443" # apiserver IP:PORT
TOKEN="c47ffb939f5ca36231d9e3121a252940" # 与 token.csv 里保持一致
# 在master上生成bootstrap.kubeconfig文件（证书写入文件）
kubectl config set-cluster kubernetes \
--certificate-authority=/opt/kubernetes/ssl/ca.pem \
--embed-certs=true \
--server=${KUBE_APISERVER} \
--kubeconfig=bootstrap.kubeconfig

kubectl config set-credentials "kubelet-bootstrap" \
--token=${TOKEN} \
--kubeconfig=bootstrap.kubeconfig

kubectl config set-context default \
--cluster=kubernetes \
--user="kubelet-bootstrap" \
--kubeconfig=bootstrap.kubeconfig

kubectl config use-context default --kubeconfig=bootstrap.kubeconfig

# 生成结果
cat bootstrap.kubeconfig
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUR3akNDQXFxZ0F3SUJBZ0lVQzdRU3FneGt6Nm1VdU04MW43dGxmOW........CRFk5cjN4UjlFK1pJd3E4UEV5OVZlbTk1Zm9zekhKME01bUZQZWFMV3ZzS1VhZEhlZGNEUHAKbWZYZ2Q2NS96dklUbUJNRDJ4VEFGVGJxeFZwMUxGdklMQXlQZDRQRC9xQ3d4clFqa0kxTHV1M3Fkd3lUQVkvZQoxZ2V0YldmUgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.56.10:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubelet-bootstrap
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: kubelet-bootstrap
  user:
    token: c47ffb939f5ca36231d9e3121a252940

# 在node执行修改后（读取本地证书）
cat > /opt/kubernetes/cfg/bootstrap.kubeconfig << 'EOF'
apiVersion: v1
clusters:
- cluster:
    certificate-authority: /opt/kubernetes/ssl/ca.pem
    server: https://192.168.56.10:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubelet-bootstrap
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: kubelet-bootstrap
  user:
    token: c47ffb939f5ca36231d9e3121a252940
EOF
```
systemd 管理 kubelet
```bash
cat > /usr/lib/systemd/system/kubelet.service << 'EOF'
[Unit]
Description=Kubernetes Kubelet
After=docker.service
[Service]
EnvironmentFile=/opt/kubernetes/cfg/kubelet.conf
ExecStart=/opt/kubernetes/bin/kubelet $KUBELET_OPTS
Restart=on-failure
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF
```
检查配置并复制证书
```bash
[root@k8s-node002 ~]# grep 192 /opt/kubernetes/cfg/*
/opt/kubernetes/cfg/bootstrap.kubeconfig:    server: https://192.168.56.10:6443

rsync -avz /opt/kubernetes/ssl/ca.pem k8s-node002:/opt/kubernetes/ssl/ca.pem
rsync -avz /opt/kubernetes/ssl/ca.pem k8s-node003:/opt/kubernetes/ssl/ca.pem
```

启动服务
```bash
systemctl daemon-reload
systemctl enable --now kubelet

apiserver 安装步骤中最后一步一定要做，否则kubelet无法启动
```

批准 kubelet 证书申请并加入集群
```bash
kubectl get csr
NAME                                                   AGE   SIGNERNAME                                    REQUESTOR           CONDITION
node-csr-X3C5Z1wfip7IoiINuC405QxSc8QAspvzBxaSOkzYYf0   78s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Pending

kubectl certificate approve node-csr-X3C5Z1wfip7IoiINuC405QxSc8QAspvzBxaSOkzYYf0
certificatesigningrequest.certificates.k8s.io/node-csr-X3C5Z1wfip7IoiINuC405QxSc8QAspvzBxaSOkzYYf0 approved

[root@k8s-node001 ~]# kubectl get nodes
NAME          STATUS     ROLES    AGE   VERSION
k8s-node002   NotReady   <none>   7s    v1.18.12
```
> 注：由于网络插件还没有部署，节点会没有准备就绪 NotReady
#### 部署kube-proxy
创建配置文件
```bash
cat > /opt/kubernetes/cfg/kube-proxy.conf << 'EOF'
KUBE_PROXY_OPTS="--logtostderr=false \
--v=2 \
--log-dir=/opt/kubernetes/logs \
--config=/opt/kubernetes/cfg/kube-proxy-config.yml"
EOF
```

```bash
cat <<EOF >/opt/kubernetes/cfg/kube-proxy-config.yml
kind: KubeProxyConfiguration
apiVersion: kubeproxy.config.k8s.io/v1alpha1
address: 0.0.0.0 # 监听地址
metricsBindAddress: 0.0.0.0:10249 # 监控指标地址,监控获取相关信息 就从这里获取
clientConnection:
  kubeconfig: /opt/kubernetes/cfg/kube-proxy.kubeconfig # 读取配置文件
hostnameOverride: $k8s-node002 # 注册到k8s的节点名称唯一
clusterCIDR: 10.0.0.0/24
#mode: iptables # 使用iptables模式

# 使用 ipvs 模式
#mode: ipvs # ipvs 模式
#ipvs:
#  scheduler: "rr"
#iptables:
#  masqueradeAll: true
EOF
```

生成 kube-proxy.kubeconfig 文件
生成 kube-proxy 证书
```bash
# master执行
cd tls/k8s/
cat > kube-proxy-csr.json <<EOF
{
  "CN": "system:kube-proxy",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "Shanghai",
      "ST": "Shanghai",
      "O": "k8s",
      "OU": "System"
    }
  ]
}
EOF

# 生成证书
$ cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-proxy-csr.json | cfssljson -bare kube-proxy

[root@k8s-node001 k8s]# ls kube-proxy*.pem
kube-proxy-key.pem  kube-proxy.pem

推送证书到node
rsync -avz /opt/kubernetes/ssl/{kube-proxy-key.pem,kube-proxy.pem} k8s-node002:/opt/kubernetes/ssl/
```

生成 kubeconfig 文件：
```bash
KUBE_APISERVER="https://192.168.56.10:6443"
kubectl config set-cluster kubernetes \
--certificate-authority=/opt/kubernetes/ssl/ca.pem \
--embed-certs=true \
--server=${KUBE_APISERVER} \
--kubeconfig=kube-proxy.kubeconfig

kubectl config set-credentials kube-proxy \
--client-certificate=./kube-proxy.pem \
--client-key=./kube-proxy-key.pem \
--embed-certs=true \
--kubeconfig=kube-proxy.kubeconfig

kubectl config set-context default \
--cluster=kubernetes \
--user=kube-proxy \
--kubeconfig=kube-proxy.kubeconfig

kubectl config use-context default --kubeconfig=kube-proxy.kubeconfig

rsync -avz kube-proxy.kubeconfig k8s-node002:/opt/kubernetes/cfg/kube-proxy.kubeconfig
rsync -avz kube-proxy.kubeconfig k8s-node003:/opt/kubernetes/cfg/kube-proxy.kubeconfig
```

systemd管理
```bash
cat > /usr/lib/systemd/system/kube-proxy.service << EOF
[Unit]
Description=Kubernetes Proxy
After=network.target
[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-proxy.conf
ExecStart=/opt/kubernetes/bin/kube-proxy \$KUBE_PROXY_OPTS
Restart=on-failure
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now kube-proxy
```

#### 部署CNI网络

下载地址：
`https://github.com/containernetworking/plugins/releases/download/v0.8.6/cni-plugins-linux-amd64-v0.8.6.tgz`

部署CNI
```bash
# 所有node执行
mkdir -p /opt/cni/{bin,net.d}
tar zxvf cni-plugins-linux-amd64-v0.8.6.tgz -C /opt/cni/bin

wget https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
# 多网卡环境下
        args:
        - --ip-masq
        - --kube-subnet-mgr
        - --iface=enp0s8 #需要指定内网网卡

kubectl apply -f kube-flannel.yml
kubectl get pods -n kube-system
kubectl get node

# 打上节点标签
kubectl label nodes node002 node-role.kubernetes.io/master=
kubectl label nodes node003 node-role.kubernetes.io/worker=
```
> 部署好网络插件，Node 准备就绪。

#### 授权apiserver访问kubelet
```yaml
cat > apiserver-to-kubelet-rbac.yaml << 'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
      - pods/log
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kubernetes
EOF
kubectl apply -f apiserver-to-kubelet-rbac.yaml 
```
#### 安装coredns插件
>不依赖kubeadm的方式，适用于不是使用kubeadm创建的k8s集群，或者kubeadm初始化集群之后，删除了dns相关部署。
```bash
# 安装coredns组件
mkdir coredns && cd coredns
wget https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/coredns.yaml.sed
wget https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/deploy.sh
chmod +x deploy.sh
./deploy.sh -i 10.0.0.2 > coredns.yml
kubectl apply -f coredns.yml

# 查看
kubectl get pods --namespace kube-system
kubectl get svc --namespace kube-system
```
#### 对接第三方DEVOPS平台
生成集群管理权限的 config 证书编写集群管理文件
```bash
cat << EOF > admin-csr.json
{
  "CN": "admin",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "Shanghai",
      "L": "Shanghai",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF

生成证书：
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes admin-csr.json | cfssljson -bare admin
```

```yaml
apiVersion: v1
clusters:
- cluster:
    insecure-skip-tls-verify: true
    server: https://LB EIP:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: {base64 admin.pem}
    client-key-data: {base64 admin-key.pem}
```

