title: k8s企业级DevOps实践-Pod管理业务应用
author: 饼铛
cover: images/pasted-6.png
abbrlink: 6b4e4d76
tags:
  - k8s
categories:
  - Web集群
date: 2021-04-25 23:04:00
---
## 核心组件
**静态Pod的方式：**

```bash
## etcd、apiserver、controller-manager、kube-scheduler

[root@k8s-master ~]# kubectl -n kube-system get po
NAME                                 READY   STATUS    RESTARTS   AGE
coredns-58cc8c89f4-gnmdb             1/1     Running   2          22h
coredns-58cc8c89f4-r9hlv             1/1     Running   2          22h
etcd-k8s-master                      1/1     Running   3          22h
kube-apiserver-k8s-master            1/1     Running   3          22h
kube-controller-manager-k8s-master   1/1     Running   3          22h
kube-flannel-ds-amd64-h4mfv          1/1     Running   2          22h
kube-flannel-ds-amd64-rz8kt          1/1     Running   1          22h
kube-flannel-ds-amd64-tpqcd          1/1     Running   2          22h
kube-proxy-6qpjh                     1/1     Running   1          22h
kube-proxy-d7p98                     1/1     Running   2          22h
kube-proxy-ntwtl                     1/1     Running   3          22h
kube-scheduler-k8s-master            1/1     Running   3          22h

[root@k8s-master ~]# ll /etc/kubernetes/manifests/
总用量 16
-rw------- 1 root root 1792 4月  26 00:10 etcd.yaml
-rw------- 1 root root 2635 4月  26 00:10 kube-apiserver.yaml
-rw------- 1 root root 2332 4月  26 00:10 kube-controller-manager.yaml
-rw------- 1 root root 1148 4月  26 00:10 kube-scheduler.yaml
# 由kubelet直接启动的
```

**systemd服务方式：**

```bash
$ systemctl status kubelet
```

kubectl：二进制命令行工具

## 集群资源
组件是为了支撑k8s平台的运行，安装好的软件。

资源是如何去使用k8s的能力的定义。比如，k8s可以使用Pod来管理业务应用，那么Pod就是k8s集群中的一类资源，集群中的所有资源可以提供如下方式查看：
```bash
$ kubectl api-resources
```

### 再谈namespace
命名空间，集群内一个虚拟的概念，类似于资源池的概念，一个池子里可以有各种资源类型，绝大多数的资源都必须属于某一个namespace。集群初始化安装好之后，会默认有如下几个namespace：
```bash
[root@k8s-master ~]# kubectl get namespaces
NAME                   STATUS   AGE
default                Active   23h
kube-node-lease        Active   23h
kube-public            Active   23h #公共资源池
kube-system            Active   23h #k8s系统资源池
kubernetes-dashboard   Active   21h #安装dashboard是自定义的资源池
```
- 所有NAMESPACED的资源，在创建的时候都需要指定namespace，若不指定，默认会在default命名空间下
- 相同namespace下的同类资源不可以重名，不同类型的资源可以重名
- 不同namespace下的同类资源可以重名
- 通常在项目使用的时候，我们会创建带有业务含义的namespace来做逻辑上的整合

```bash
#查看资源池内的资源
[root@k8s-master ~]# kubectl -n kube-system get po
NAME                                 READY   STATUS    RESTARTS   AGE
coredns-58cc8c89f4-gnmdb             1/1     Running   2          23h
coredns-58cc8c89f4-r9hlv             1/1     Running   2          23h
etcd-k8s-master                      1/1     Running   3          23h
kube-apiserver-k8s-master            1/1     Running   3          23h
kube-controller-manager-k8s-master   1/1     Running   3          23h
kube-flannel-ds-amd64-h4mfv          1/1     Running   2          22h
kube-flannel-ds-amd64-rz8kt          1/1     Running   1          22h
kube-flannel-ds-amd64-tpqcd          1/1     Running   2          22h
kube-proxy-6qpjh                     1/1     Running   1          23h
kube-proxy-d7p98                     1/1     Running   2          23h
kube-proxy-ntwtl                     1/1     Running   3          23h
kube-scheduler-k8s-master            1/1     Running   3          23h

可以看到再集群搭建时安装的k8s核心组件，-n 指定资源池
```

## kubectl的使用

类似于docker，kubectl是命令行工具，用于与APIServer交互，内置了丰富的子命令，功能极其强大。 [文档链接](https://kubernetes.io/docs/reference/kubectl/overview/)
```bash
$ kubectl -h
$ kubectl get -h
$ kubectl create -h
$ kubectl create namespace -h
```

kubectl如何管理集群资源
```bash
$ kubectl get po -v=7
```
## 最小调度单元 Pod
docker调度的是容器，而在k8s集群中，最小的调度单元是Pod（豆荚）

![pod](/images/pasted-43.png)

### 为什么引入Pod

- 与容器引擎解耦（Docker、Rkt。平台设计与引擎的具体的实现解耦）

- 多容器共享网络|存储|进程 空间, 支持的业务场景更加灵活。<u>**划重点**</u>

### 使用yaml格式定义Pod
[k8sdemo Git仓库地址](https://gitee.com/pinchengx/k8sdemo)
```yaml
*myblog/one-pod/pod.yaml*
apiVersion: v1 #引入某类资源的成熟度
kind: Pod #引入资源的类型
metadata: #元数据 kubectl explain pod.metadata 查看
  name: myblog #名称
  namespace: demo #资源池名称
  labels: #资源标签
    component: myblog
spec:
  containers: #容器定义
  - name: myblog #容器名称
    image: 192.168.56.10:5000/myblog:v2 #镜像地址
    env: #环境变量
    - name: MYSQL_HOST   #指定root用户的用户名
      value: "127.0.0.1"
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002 #这个容器暴露的端口
  - name: mysql #容器名称
    image: 192.168.56.10:5000/mysql:5.7-utf8 #镜像地址
    ports:
    - containerPort: 3306 #这个容器暴露的端口
    env: #环境变量
    - name: MYSQL_ROOT_PASSWORD
      value: "123456"
    - name: MYSQL_DATABASE
      value: "myblog"
```
- 翻译成json格式：

```json
{
	"apiVersion": "v1",		
	"kind": "Pod",
	"metadata": {
		"name": "myblog",
        "namespace": "demo",
        "labels": {
            "component": "myblog"
        }
	},
	"spec": {
		"containers": [
			{
				"name": "myblog",
				"image": "192.168.56.10:5000/myblog",
                "env": [
                    {
                        "name": "MYSQL_HOST",
                        "value": "127.0.0.1"
                    },
                    {
                        "name": "MYSQL_PASSWD",
                        "value": "123456"
                    }
                ],
				"ports": [
					{
						"containerPort": 8002
					}
				]
			},
    		{
    			"name": "mysql",
                ...
			}
		]
	}
}
```
| apiVersion | 含义                                                   |
| :--------- | :----------------------------------------------------- |
| alpha      | 进入K8s功能的早期候选版本，可能包含Bug，最终不一定进入K8s      |
| beta       | 已经过测试的版本，最终会进入K8s，但功能、对象定义可能会发生变更。|
| stable     | 可安全使用的稳定版本                                      |
| v1         | stable 版本之后的首个版本，包含了更多的核心对象              |
| apps/v1    | 使用最广泛的版本，像Deployment、ReplicaSets都已进入该版本   |

- 资源类型与apiVersion对照表


| Kind                  | apiVersion                              |
| :-------------------- | :-------------------------------------- |
| ClusterRoleBinding    | rbac.authorization.k8s.io/v1            |
| ClusterRole           | rbac.authorization.k8s.io/v1            |
| ConfigMap             | v1                                      |
| CronJob               | batch/v1beta1                           |
| DaemonSet             | extensions/v1beta1                      |
| Node                  | v1                                      |
| Namespace             | v1                                      |
| Secret                | v1                                      |
| PersistentVolume      | v1                                      |
| PersistentVolumeClaim | v1                                      |
| Pod                   | v1                                      |
| Deployment            | v1、apps/v1、apps/v1beta1、apps/v1beta2 |
| Service               | v1                                      |
| Ingress               | extensions/v1beta1                      |
| ReplicaSet            | apps/v1、apps/v1beta2                   |
| Job                   | batch/v1                                |
| StatefulSet           | apps/v1、apps/v1beta1、apps/v1beta2     |

- 快速获得资源和版本

```bash
$ kubectl explain pod
$ kubectl explain Pod.apiVersion
```
### 创建和访问Pod

```bash
## 准备业务镜像
docker tag mysql:5.7-utf8 192.168.56.10:5000/mysql:5.7-utf8
docker tag myblog:v2 192.168.56.10:5000/myblog:v2

docker push 192.168.56.10:5000/mysql:5.7-utf8
docker push 192.168.56.10:5000/myblog:v2

## 创建namespace, namespace是逻辑上的资源池
$ kubectl create namespace demo

## 使用指定文件创建Pod
$ kubectl create -f demo-pod.yaml

## 查看pod，可以简写po
[root@k8s-master poddemo]# kubectl -n demo get pods -o wide
NAME     READY   STATUS             RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
myblog   0/2     ImagePullBackOff   0          20s   10.244.2.11   k8s-slave1   <none>           <none>
## 报错，查看详情
kubectl -n demo describe po myblog
拉取镜像报错，原因仓库中的镜像和ymal中名称不一致

kubectl -n demo delete pod myblog
删除pod 重新生成


## 所有的操作都需要指定namespace，如果是在default命名空间下，则可以省略
$ kubectl -n demo get pods -o wide
NAME     READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
myblog   2/2     Running   0          13s   10.244.2.16   k8s-slave1   <none>           <none>

## 查看调度详情（调度到了k8s-slave1节点）
kubectl -n demo describe pod myblog
  Type    Reason     Age        From                 Message
  ----    ------     ----       ----                 -------
  Normal  Scheduled  <unknown>  default-scheduler    Successfully assigned demo/myblog to k8s-slave1
  Normal  Pulled     6m1s       kubelet, k8s-slave1  Container image "192.168.56.10:5000/myblog:v2" already present on machine
  Normal  Created    6m1s       kubelet, k8s-slave1  Created container myblog
  Normal  Started    6m1s       kubelet, k8s-slave1  Started container myblog
  Normal  Pulling    6m1s       kubelet, k8s-slave1  Pulling image "192.168.56.10:5000/mysql:5.7utf8"
  Normal  Pulled     6m1s       kubelet, k8s-slave1  Successfully pulled image "192.168.56.10:5000/mysql:5.7utf8"
  Normal  Created    6m1s       kubelet, k8s-slave1  Created container mysql
  Normal  Started    6m1s       kubelet, k8s-slave1  Started container mysql

## 使用Pod Ip访问服务,3306和8002
$ curl 10.244.2.16:8002/blog/index/

## 进入容器,执行初始化, 不必到对应的主机执行docker exec
$ kubectl -n demo exec -ti myblog -c myblog bash
/ # env
/ # python3 manage.py migrate
$ kubectl -n demo exec -ti myblog -c mysql bash
/ # mysql -p123456

## 再次访问服务,3306和8002
$ curl 10.244.2.16:8002/blog/index/

## 进到slave1上查看pod状态
[root@k8s-slave1 ~]# docker ps | grep myblog
43da28757d00   192.168.56.10:5000/mysql                            "docker-entrypoint.s…"   16 minutes ago   Up 16 minutes             k8s_mysql_myblog_demo_e42b0d34-2cae-4d11-be8d-eb43691eb7cc_0
39674d67b6a8   c81fbb3b55c2                                        "./run.sh"               16 minutes ago   Up 16 minutes             k8s_myblog_myblog_demo_e42b0d34-2cae-4d11-be8d-eb43691eb7cc_0
84120ea0dbbd   registry.aliyuncs.com/google_containers/pause:3.1   "/pause"                 16 minutes ago   Up 16 minutes             k8s_POD_myblog_demo_e42b0d34-2cae-4d11-be8d-eb43691eb7cc_0
//如何判断主机中pod数量 过滤关键词pause:3.1
```
### Infra容器

登录`k8s-slave1`节点

```bash
$ docker ps -a |grep myblog  ## 发现有三个容器
## 其中包含mysql和myblog程序以及Infra容器
## 为了实现Pod内部的容器可以通过localhost通信，每个Pod都会启动Infra容器，然后Pod内部的其他容器的网络空间会共享该Infra容器的网络空间(Docker网络的container模式)，Infra容器只需要hang住网络空间，不需要额外的功能，因此资源消耗极低。

## 登录master节点，查看pod内部的容器ip均相同，为pod ip
$ kubectl -n demo exec -ti myblog -c myblog bash
/ # ifconfig
$ kubectl -n demo exec -ti myblog -c mysql bash
/ # ifconfig
```
pod容器命名: ```k8s_<container_name>_<pod_name>_<namespace>_<random_string>```

### 查看pod详细信息

```bash
## 查看pod调度节点及pod_ip
$ kubectl -n demo get pods -o wide
## 查看完整的yaml
$ kubectl -n demo get po myblog -o yaml
## 查看pod的明细信息及事件，etcd中存储时间很短，可以加长但是影响性能
$ kubectl -n demo describe pod myblog
```
### Troubleshooting and Debugging

```bash
#进入Pod内的容器
$ kubectl -n <namespace> exec <pod_name> -c <container_name> -ti /bin/sh

#查看Pod内容器日志,显示标准或者错误输出日志
$ kubectl -n <namespace> logs -f <pod_name> -c <container_name>
```

### 更新服务版本

```bash
$ docker build . -t 192.168.56.10:5000/myblog:v2 -f Dockerfile
#构建更新一步到位

$ kubectl apply -f demo-pod.yaml
# 更新完push到仓库后 执行此命令
```

### 删除Pod服务

```bash
#根据文件删除
$ kubectl delete -f demo-pod.yaml

#根据pod_name删除
$ kubectl -n <namespace> delete pod <pod_name>
```

### Pod数据持久化

若删除了Pod，由于mysql的数据都在容器内部，会造成数据丢失，因此需要数据进行持久化。

- 定点使用hostpath挂载，nodeSelector定点（将Pod调度到指定的容器通过标签的方式）
  - 所有容器可共享volumes


`myblog/one-pod/pod-with-volume.yaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myblog
  namespace: demo
  labels:
    component: myblog
spec:
  volumes: 
  - name: mysql-data
    hostPath: 
      path: /opt/mysql/data
  nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
    component: mysql
  containers:
  - name: myblog
    image: 192.168.56.10:5000/myblog:v2
    env:
    - name: MYSQL_HOST   #  指定root用户的用户名
      value: "127.0.0.1"
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002
  - name: mysql
    image: 192.168.56.10:5000/mysql:5.7-utf8
    ports:
    - containerPort: 3306
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "123456"
    - name: MYSQL_DATABASE
      value: "myblog"
    volumeMounts:
    - name: mysql-data
      mountPath: /var/lib/mysql
```

保存文件为`pod-with-volume.yaml`，执行创建

```bash
## 若存在旧的同名服务，先删除掉，后创建
$ kubectl -n demo delete pod myblog
## 创建
$ kubectl create -f pod-with-volume.yaml

## 此时pod状态Pending
$ kubectl -n demo get po
NAME     READY   STATUS    RESTARTS   AGE
myblog   0/2     Pending   0          32s

## 查看原因，提示调度失败，因为节点不满足node selector(没有节点打标签)
$ kubectl -n demo describe po myblog
Events:
  Type     Reason            Age                From               Message
  ----     ------            ----               ----               -------
  Warning  FailedScheduling  12s (x2 over 12s)  default-scheduler  0/3 nodes are available: 3 node(s) didn't match node selector.
  
## 为slavel1节点打标签
$ kubectl label node k8s-slave1 component=mysql
  
[root@k8s-master cjhdemo]# kubectl get nodes --show-labels
NAME         STATUS   ROLES    AGE   VERSION   LABELS
k8s-master   Ready    master   26h   v1.16.2   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=k8s-master,kubernetes.io/os=linux,node-role.kubernetes.io/master=
k8s-slave1   Ready    <none>   26h   v1.16.2   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,component=mysql,kubernetes.io/arch=amd64,kubernetes.io/hostname=k8s-slave1,kubernetes.io/os=linux
k8s-slave2   Ready    <none>   26h   v1.16.2   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=k8s-slave2,kubernetes.io/os=linux

## 执行成功
[root@k8s-master cjhdemo]# kubectl -n demo get po 
NAME     READY   STATUS    RESTARTS   AGE
myblog   2/2     Running   0          6m40s

[root@k8s-master cjhdemo]# kubectl -n demo get po -o wide
NAME     READY   STATUS    RESTARTS   AGE     IP            NODE         NOMINATED NODE   READINESS GATES
myblog   2/2     Running   0          5m59s   10.244.2.17   k8s-slave1   <none>           <none>

## 到k8s-slave1节点，查看/opt/mysql/data
$ ll /opt/mysql/data/
[root@k8s-slave1 ~]# ll /opt/mysql/data/
总用量 188488
-rw-r----- 1 polkitd ssh_keys       56 4月  27 02:30 auto.cnf
-rw------- 1 polkitd ssh_keys     1676 4月  27 02:30 ca-key.pem
-rw-r--r-- 1 polkitd ssh_keys     1112 4月  27 02:30 ca.pem
-rw-r--r-- 1 polkitd ssh_keys     1112 4月  27 02:30 client-cert.pem
-rw------- 1 polkitd ssh_keys     1676 4月  27 02:30 client-key.pem
-rw-r----- 1 polkitd ssh_keys     1359 4月  27 02:30 ib_buffer_pool
-rw-r----- 1 polkitd ssh_keys 79691776 4月  27 02:30 ibdata1
-rw-r----- 1 polkitd ssh_keys 50331648 4月  27 02:30 ib_logfile0
-rw-r----- 1 polkitd ssh_keys 50331648 4月  27 02:30 ib_logfile1
-rw-r----- 1 polkitd ssh_keys 12582912 4月  27 02:30 ibtmp1
drwxr-x--- 2 polkitd ssh_keys       20 4月  27 02:30 myblog
-rw-r----- 1 polkitd ssh_keys        2 4月  27 02:30 myblog.pid
drwxr-x--- 2 polkitd ssh_keys     4096 4月  27 02:30 mysql
drwxr-x--- 2 polkitd ssh_keys     8192 4月  27 02:30 performance_schema
-rw------- 1 polkitd ssh_keys     1680 4月  27 02:30 private_key.pem
-rw-r--r-- 1 polkitd ssh_keys      452 4月  27 02:30 public_key.pem
-rw-r--r-- 1 polkitd ssh_keys     1112 4月  27 02:30 server-cert.pem
-rw------- 1 polkitd ssh_keys     1680 4月  27 02:30 server-key.pem
drwxr-x--- 2 polkitd ssh_keys     8192 4月  27 02:30 sys

## 执行migrate，创建数据库表，然后删掉pod，再次创建后验证数据是否存在
$ kubectl -n demo exec -ti myblog python3 manage.py migrate

## 访问服务，正常
[root@k8s-master cjhdemo]# curl 10.244.2.17:8002/blog/index/ 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>首页</title>
</head>
<body>
<h3>我的博客列表：</h3>
    

    </br>
    </br>
    <a href=" /blog/article/edit/0 ">写博客</a>

</body>

## 删除pod
$ kubectl delete -f pod-with-volume.yaml

## 再次创建Pod
$ kubectl create -f pod-with-volume.yaml

## 查看pod ip并访问服务
$ kubectl -n demo get po -o wide
NAME     READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
myblog   2/2     Running   0          29s   10.244.2.18   k8s-slave1   <none>           <none>

## 未做migrate，服务正常
$ curl 10.244.2.18:8002/blog/index/
```