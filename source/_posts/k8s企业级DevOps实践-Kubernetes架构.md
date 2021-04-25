title: k8s企业级DevOps实践-Kubernetes架构、Kubernetes集群安装
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

## Kubernetes安装
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
$ systemctl enable docker && systemctl start docker
```
### 部署kubernetes

#### 安装 kubeadm, kubelet 和 kubectl
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

操作节点：只在master节点（`k8s-master`）执行

``` bash
# 查看需要使用的镜像列表,若无问题，将得到如下列表
$ kubeadm config images list --config kubeadm.yaml
registry.aliyuncs.com/google_containers/kube-apiserver:v1.16.0
registry.aliyuncs.com/google_containers/kube-controller-manager:v1.16.0
registry.aliyuncs.com/google_containers/kube-scheduler:v1.16.0
registry.aliyuncs.com/google_containers/kube-proxy:v1.16.0
registry.aliyuncs.com/google_containers/pause:3.1
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
...
$ docker tag mirrorgooglecontainers/etcd-amd64:3.3.15-0 k8s.gcr.io/etcd:3.3.15-0
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
        image: 192.168.56.10：5000/coreos/flannel:v0.11.0-amd64
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

#### 设置master节点是否可调度（可选）

操作节点：`k8s-master`

默认部署成功后，master节点无法调度业务pod，如需设置master节点也可以参与pod的调度，需执行：

``` python
$ kubectl taint node k8s-master node-role.kubernetes.io/master:NoSchedule-
```

#### 验证集群

操作节点： 在master节点（`k8s-master`）执行

``` python
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

``` powershell
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
  - ashboard:v2.0.0-beta5
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

- **创建ServiceAccount进行访问**

```bash
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

好的开始是成功的一半，到此k8s集群安装成功！