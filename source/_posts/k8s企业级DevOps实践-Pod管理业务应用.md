title: k8s企业级DevOps实践-Pod管理、健康检查、ConfigMap和Secret的定义与容器编排
author: 饼铛
cover: images/pasted-6.png
abbrlink: 6b4e4d76
tags:
  - k8s
  - 容器编排
categories:
  - Web集群
date: 2021-04-28 07:04:00
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
--grace-period=0 --force //强制删除，一般不用
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
  - name: mysql-data #volume名字
    hostPath: #持久化到node的哪个位置
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
    volumeMounts: #挂载volume到pod内mysql容器中
    - name: mysql-data #volume名字
      mountPath: /var/lib/mysql #容器内的路径
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

#### 使用PV+PVC连接分布式存储解决方案
 - ceph
 - glusterfs
 - nfs

### 服务健康检查
检测容器服务是否健康的手段，若不健康，会根据设置的重启策略（restartPolicy）进行操作，两种检测机制可以分别单独设置，若不设置，默认认为Pod是健康的。

**三种机制：**
- StartupProbe探针
  k8s 1.16版本后新加的探测方式，用于判断容器内应用程序是否已经启动。如果配置了startupProbe，就会先禁止其他的探测，直到它成功为止，成功后将不再进行探测。比较适用于容器启动时间长的场景
- LivenessProbe探针
  用于判断容器是否存活，即Pod是否为`running`状态，如果LivenessProbe探针探测到容器不健康，则kubelet将kill掉容器，并根据容器的重启策略是否重启，如果一个容器不包含LivenessProbe探针，则Kubelet认为容器的LivenessProbe探针的返回值永远成功。 
- ReadinessProbe探针
  用于判断容器是否正常提供服务，即容器的`Ready`是否为True，是否可以接收请求，如果ReadinessProbe探测失败，则容器的Ready将为False，控制器将此Pod的Endpoint从对应的service的Endpoint列表中移除，从此不再将任何请求调度此Pod上，直到下次探测成功。（剔除此pod不参与接收请求不会将流量转发给此Pod）。
  
**三种类型：**
- exec：通过执行命令来检查服务是否正常，回值为0则表示容器健康
- httpGet方式：通过发送http请求检查服务是否正常，返回200-399状态码则表明容器健康
- tcpSocket：通过容器的IP和Port执行TCP检查，如果能够建立TCP连接，则表明容器健康

示例：

完整文件路径 ` myblog/one-pod/pod-with-healthcheck.yaml`

```bash
  containers:
  - name: myblog
    image: 172.21.32.6:5000/myblog
    env:
    - name: MYSQL_HOST   #  指定root用户的用户名
      value: "127.0.0.1"
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002
    startupProbe: # 可选，检测容器内进程是否完成启动
#      httpGet:      # httpGet检测方式，生产环境建议使用httpGet实现接口级健康检查，健康检查由应用程序提供。
#        path: /blog/index/ # 检查路径
#        port: 8002
    livenessProbe:
      httpGet:
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10  # 容器启动后第一次执行探测是需要等待多少秒
      periodSeconds: 15 	# 执行探测的频率
      timeoutSeconds: 2		# 探测超时时间
    readinessProbe: 
      httpGet: 
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10 
      timeoutSeconds: 2
      periodSeconds: 15
```
- `initialDelaySeconds`：容器启动后第一次执行探测是需要等待多少秒。
- `periodSeconds`：执行探测的频率。默认是10秒，最小1秒。
- `timeoutSeconds`：探测超时时间。默认1秒，最小1秒。
- `successThreshold`：探测失败后，最少连续探测成功多少次才被认定为成功。默认是1。对于liveness必须是1，最小值是1。
- `failureThreshold`：探测成功后，最少连续探测失败多少次才被认定为失败。默认是3，最小值是1。
  
**重启策略：**
Pod的重启策略（RestartPolicy）应用于Pod内的所有容器，并且仅在Pod所处的Node上由kubelet进行判断和重启操作。当某个容器异常退出或者健康检查失败时，kubelet将根据RestartPolicy的设置来进行相应的操作。

Pod的重启策略包括`Always`、`OnFailure`和`Never`，默认值为Always。

- Always：当容器失败时，由kubelet自动重启该容器；
- OnFailure：当容器终止运行且退出码不为0时，有kubelet自动重启该容器；
- Never：不论容器运行状态如何，kubelet都不会重启该容器。

### 镜像拉取策略
```yaml
spec:
  containers:
  - name: myblog
    image: 172.21.32.6:5000/demo/myblog
    imagePullPolicy: IfNotPresent
```

设置镜像的拉取策略，默认为IfNotPresent

- Always，总是拉取镜像，即使本地有镜像也从仓库拉取(统一标签的镜像被不同版本的代码重复使用时)
- IfNotPresent ，本地有则使用本地镜像，本地没有则去仓库拉取
- Never，只使用本地镜像，本地没有则报错

### Pod资源限制

为了保证充分利用集群资源，且确保重要容器在运行周期内能够分配到足够的资源稳定运行，因此平台需要具备

Pod的资源限制的能力。 对于一个pod来说，资源最基础的2个的指标就是：CPU和内存。

Kubernetes提供了个采用requests和limits 两种类型参数对资源进行预分配和使用限制。

完整文件路径：`myblog/one-pod/pod-with-resourcelimits.yaml`

```yaml
...
  containers:
  - name: myblog
    image: 172.21.32.6:5000/myblog
    env:
    - name: MYSQL_HOST   #  指定root用户的用户名
      value: "127.0.0.1"
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002
    resources: #资源作用单位时容器
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
...
```

`requests`：

- 容器使用的最小资源需求,作用于schedule(调度)阶段，作为容器调度时资源分配的判断依赖
- 只有当前节点上可分配的资源量 >= request 时才允许将容器调度到该节点
- request参数不限制容器的最大可使用资源
- requests.cpu被转成docker的--cpu-shares参数，与cgroup cpu.shares功能相同 (无论宿主机有多少个cpu或者内核，--cpu-shares选项都会按照比例分配cpu资源）
- requests.memory没有对应的docker参数，仅作为k8s调度依据

`limits`：

- 容器能使用资源的最大值
- 设置为0表示对使用的资源不做限制, 可无限的使用
- 当pod 内存超过limit时，会被oom
- 当cpu超过limit时，不会被kill，但是会限制不超过limit值
- limits.cpu会被转换成docker的–cpu-quota参数。与cgroup cpu.cfs_quota_us功能相同
- limits.memory会被转换成docker的–memory参数。用来限制容器使用的最大内存

 对于 CPU，我们知道计算机里 CPU 的资源是按`“时间片”`的方式来进行分配的，系统里的每一个操作都需要 CPU 的处理，所以，哪个任务要是申请的 CPU 时间片越多，那么它得到的 CPU 资源就越多。

然后还需要了解下 CGroup 里面对于 CPU 资源的单位换算：

```bash
1 CPU =  1000 millicpu（1 Core = 1000m）
```

 这里的 `m` 就是毫、毫核的意思，Kubernetes 集群中的每一个节点可以通过操作系统的命令来确认本节点的 CPU 内核数量，然后将这个数量乘以1000，得到的就是节点总 CPU 总毫数。比如一个节点有四核，那么该节点的 CPU 总毫量为 4000m。 

`docker run`命令和 CPU 限制相关的所有选项如下：

| 选项                  | 描述                                                    |
| --------------------- | ------------------------------------------------------- |
| `--cpuset-cpus=""`    | 允许使用的 CPU 集，值可以为 0-3,0,1                     |
| `-c`,`--cpu-shares=0` | CPU 共享权值（相对权重）                                |
| `cpu-period=0`        | 限制 CPU CFS 的周期，范围从 100ms~1s，即[1000, 1000000] |
| `--cpu-quota=0`       | 限制 CPU CFS 配额，必须不小于1ms，即 >= 1000，绝对限制  |

```shell
docker run -it --cpu-period=50000 --cpu-quota=25000 ubuntu:16.04 /bin/bash
```

将 CFS 调度的周期设为 50000，将容器在每个周期内的 CPU 配额设置为 25000，表示该容器每 50ms 可以得到 50% 的 CPU 运行时间。

> 注意：若内存使用超出限制，会引发系统的OOM机制，因CPU是可压缩资源，不会引发Pod退出或重建

### yaml优化
目前完善后的yaml，`myblog/one-pod/pod-completed.yaml`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myblog #pod的名字
  namespace: demo #属于哪个ns
  labels:
    component: myblog
spec:
  volumes: 
  - name: mysql-data #volume名字
    hostPath: #持久化到node的哪个位置
      path: /opt/mysql/data
  nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
    component: mysql
  containers:
  - name: myblog
    image: 192.168.56.10:5000/myblog:v2
    env:
    - name: MYSQL_HOST   # 指定root用户的用户名
      value: "127.0.0.1"
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002
    resources: #资源限制
      requests: #最小使用资源，用于调度
        memory: 100Mi
        cpu: 50m
      limits: #最大资源限制
        memory: 500Mi
        cpu: 100m
    livenessProbe: #容器级别健康检查判断容器是否存活
      httpGet: #检查路径
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10  # 容器启动后第一次执行探测是需要等待多少秒
      periodSeconds: 15 	# 执行探测的频率
      timeoutSeconds: 2		# 探测超时时间
    readinessProbe: #容器级别健康判断容器是否正常提供服务
      httpGet: 
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10 
      timeoutSeconds: 2
      periodSeconds: 15
  - name: mysql
    image: 192.168.56.10:5000/mysql:5.7-utf8
    ports:
    - containerPort: 3306
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "123456"
    - name: MYSQL_DATABASE
      value: "myblog"
    resources:
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
    readinessProbe: #容器级别健康判断容器是否正常提供服务
      tcpSocket: #采用tcp判断是否能够建立链接
        port: 3306
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe: #容器级别健康检查判断容器是否存活
      tcpSocket: #采用tcp判断是否能够建立链接
        port: 3306
      initialDelaySeconds: 15
      periodSeconds: 20
    volumeMounts: #持久化相关，挂载mysql-data数据卷到容器内部/var/lib/mysql
    - name: mysql-data
      mountPath: /var/lib/mysql
 
kubectl -n demo get pods -o wide //检查pod是否正常
```
#### 拆分yaml
以上yaml还要优化，拆分成两个小的yaml

- 考虑真实的使用场景，像数据库这类中间件，是作为公共资源，为多个项目提供服务，不适合和业务容器绑定在同一个Pod中，因为业务容器是经常变更的，而数据库不需要频繁迭代
- yaml的环境变量中存在敏感信息（账号、密码），存在安全隐患

`myblog/two-pod/mysql.yaml`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
  namespace: demo
  labels:
    component: mysql
spec:
  hostNetwork: true	# 声明pod的网络模式为host模式，效果通docker run --net=host,将容器3306端口映射到宿主机192.168.56.20的3306端口，中间件的网络可以写死
  volumes: 
  - name: mysql-data
    hostPath: 
      path: /opt/mysql/data
  nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
    component: mysql
  containers:
  - name: mysql
    image: 192.168.56.10:5000/mysql:5.7-utf8
    ports:
    - containerPort: 3306
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "123456"
    - name: MYSQL_DATABASE
      value: "myblog"
    resources:
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
    readinessProbe:
      tcpSocket:
        port: 3306
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      tcpSocket:
        port: 3306
      initialDelaySeconds: 15
      periodSeconds: 20
    volumeMounts:
    - name: mysql-data
      mountPath: /var/lib/mysql
```
`myblog.yaml`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myblog
  namespace: demo
  labels:
    component: myblog
spec:
  containers:
  - name: myblog
    image: 192.168.56.10:5000/myblog:v2
    imagePullPolicy: IfNotPresent
    env:
    - name: MYSQL_HOST   #  指定root用户的用户名
      value: "192.168.56.20" #连接slave1宿主机的3306端口
    - name: MYSQL_PASSWD
      value: "123456"
    ports:
    - containerPort: 8002
    resources:
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
    livenessProbe:
      httpGet:
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10  # 容器启动后第一次执行探测是需要等待多少秒
      periodSeconds: 15 	# 执行探测的频率
      timeoutSeconds: 2		# 探测超时时间
    readinessProbe: 
      httpGet: 
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10 
      timeoutSeconds: 2
      periodSeconds: 15
```

#### 重新构建pod
```bash
# 查看当前pod
[root@k8s-master one-pod]# kubectl -n demo get po
NAME     READY   STATUS    RESTARTS   AGE
myblog   2/2     Running   0          25m

# 删除pod
[root@k8s-master one-pod]# kubectl delete -ndemo po myblog
pod "myblog" deleted

# 单独创建mysql pod
[root@k8s-master two-pod]# kubectl create -f mysql.yaml 
pod/mysql created
[root@k8s-master two-pod]# kubectl -n demo get po
NAME    READY   STATUS    RESTARTS   AGE
mysql   1/1     Running   0          22s

# 单独创建myblog pod
[root@k8s-master two-pod]# kubectl create -f myblog.yaml

# 查看pod，注意mysqlIP为宿主机IP，因为网络模式为host
[root@k8s-master two-pod]# kubectl -n demo get po -o wide 
NAME     READY   STATUS    RESTARTS   AGE     IP              NODE         NOMINATED NODE   READINESS GATES
myblog   1/1     Running   0          5m48s   10.244.2.29     k8s-slave1   <none>           <none>
mysql    1/1     Running   0          16m     192.168.56.20   k8s-slave1   <none>           <none>

#访问测试
[root@k8s-master two-pod]# curl 10.244.2.29:8002
<!DOCTYPE html>
<html lang="en">
<head>
...
```

#### configMap和Secret
环境变量中敏感信息带来的安全隐患，为何要统一管理环境变量?

- 环境变量中有很多敏感的信息，比如账号密码，直接暴漏在yaml文件中存在安全性问题
- 团队内部一般存在多个项目，这些项目直接存在配置相同环境变量的情况，因此可以统一维护管理
- 对于开发、测试、生产环境，由于配置均不同，每套环境部署的时候都要修改yaml，带来额外的开销

k8s提供两类资源，`configMap`和`Secret`，可以用来实现业务配置的统一管理， 允许将配置文件与镜像文件分离，以使容器化的应用程序具有可移植性 。

![configMap和Secret](/images/pasted-44.png)

- configMap，通常用来管理应用的配置文件或者环境变量，`myblog/two-pod/configmap.yaml`


  ```yaml
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: myblog
    namespace: demo
  data:
    MYSQL_HOST: "192.168.56.20"
    MYSQL_PORT: "3306"
  ```
  
创建并查看：
```bash
$ kubectl create -f configmap.yaml
$ kubectl -n demo get configmap
$ kubectl -n demo describe configmap myblog
Name:         myblog
Namespace:    demo
Labels:       <none>
Annotations:  <none>

Data
====
MYSQL_PORT:
----
3306
MYSQL_HOST:
----
192.168.56.20
Events:  <none>
```

- Secret，管理敏感类的信息，默认会base64编码存储，有三种类型

  - Service Account ：用来访问Kubernetes API，由Kubernetes自动创建，并且会自动挂载到Pod的/run/secrets/kubernetes.io/serviceaccount目录中；创建ServiceAccount后，Pod中指定serviceAccount后，自动创建该ServiceAccount对应的secret；
  - Opaque ： base64编码格式的Secret，用来存储密码、密钥等；
  - kubernetes.io/dockerconfigjson ：用来存储私有docker registry的认证信息`myblog/two-pod/secret.yaml`


  ```yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: myblog
    namespace: demo
  type: Opaque
  data:
    MYSQL_USER: cm9vdA==		#注意加-n参数否则值中会带换行， echo -n root|base64
    MYSQL_PASSWD: MTIzNDU2
  ```

#### 重新构建pod
```bash
$ kubectl create -f secret.yaml
$ kubectl -n demo get secret
$ kubectl -n demo describe secret myblog
Name:         myblog
Namespace:    demo
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
MYSQL_PASSWD:  6 bytes
MYSQL_USER:    4 bytes
```

如果不习惯这种方式，可以通过如下方式：

```bash
$ cat secret.txt
MYSQL_USER=root
MYSQL_PASSWD=123456
$ kubectl -n demo create secret generic myblog --from-env-file=secret.txt 
```
修改后的myblog的yaml，资源路径：`myblog/two-pod/myblog-with-config.yaml`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myblog
  namespace: demo
  labels:
    component: myblog
spec:
  containers:
  - name: myblog
    image: 192.168.56.10:5000/myblog:v2
    imagePullPolicy: IfNotPresent
    env:
    - name: MYSQL_HOST
      valueFrom: # 值来自
        configMapKeyRef: # 来自configMap
          name: myblog # configMap所在pod
          key: MYSQL_HOST # 取对应的键内容
    - name: MYSQL_PORT
      valueFrom:
        configMapKeyRef:
          name: myblog
          key: MYSQL_PORT
    - name: MYSQL_USER 
      valueFrom: # 值来自
        secretKeyRef: # 来自secret
          name: myblog # secret所在pod
          key: MYSQL_USER # 取对应的键内容
    - name: MYSQL_PASSWD
      valueFrom:
        secretKeyRef:
          name: myblog
          key: MYSQL_PASSWD
    ports:
    - containerPort: 8002
    resources:
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
    livenessProbe:
      httpGet:
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10  # 容器启动后第一次执行探测是需要等待多少秒
      periodSeconds: 15         # 执行探测的频率
      timeoutSeconds: 2         # 探测超时时间
    readinessProbe: 
      httpGet: 
        path: /blog/index/
        port: 8002
        scheme: HTTP
      initialDelaySeconds: 10 
      timeoutSeconds: 2
      periodSeconds: 15
```

修改后的mysql的yaml，资源路径：`myblog/two-pod/mysql-with-config.yaml`
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
  namespace: demo
  labels:
    component: mysql
spec:
  hostNetwork: true     # 声明pod的网络模式为host模式，效果通docker run --net=host
  volumes: 
  - name: mysql-data
    hostPath: 
      path: /opt/mysql/data
  nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
    component: mysql
  containers:
  - name: mysql
    image: 192.168.56.10:5000/mysql:5.7-utf8
    ports:
    - containerPort: 3306
    env:
    - name: MYSQL_USER
      valueFrom:
        secretKeyRef:
          name: myblog
          key: MYSQL_USER
    - name: MYSQL_PASSWD
      valueFrom:
        secretKeyRef:
          name: myblog
          key: MYSQL_PASSWD
    - name: MYSQL_DATABASE
      value: "myblog"
    resources:
      requests:
        memory: 100Mi
        cpu: 50m
      limits:
        memory: 500Mi
        cpu: 100m
    readinessProbe:
      tcpSocket:
        port: 3306
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      tcpSocket:
        port: 3306
      initialDelaySeconds: 15
      periodSeconds: 20
    volumeMounts:
    - name: mysql-data
      mountPath: /var/lib/mysql
```
在部署不同的环境时，pod的yaml无须再变化，只需要在每套环境中维护一套ConfigMap和Secret即可。但是注意configmap和secret不能跨namespace使用，且更新后，pod内的env不会自动更新，重建后方可更新。
部署测试：
```bash
# 查看当前pod
[root@k8s-master two-pod]# kubectl -n demo get po
NAME     READY   STATUS    RESTARTS   AGE
myblog   1/1     Running   0          48m
mysql    1/1     Running   0          59m

# 删除pod
[root@k8s-master one-pod]# kubectl delete -ndemo po myblog
pod "myblog" deleted
[root@k8s-master two-pod]# kubectl delete -ndemo po mysql
pod "mysql" deleted


# 检查configmap和secret
[root@k8s-master two-pod]# kubectl -n demo describe secret myblog
Name:         myblog
Namespace:    demo
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
MYSQL_PASSWD:  6 bytes
MYSQL_USER:    4 bytes
[root@k8s-master two-pod]# kubectl -n demo describe configmap myblog
Name:         myblog
Namespace:    demo
Labels:       <none>
Annotations:  <none>

Data
====
MYSQL_HOST:
----
192.168.56.20
MYSQL_PORT:
----
3306
Events:  <none>

# 单独创建mysql pod
[root@k8s-master two-pod]# kubectl create -f mysql-with-config.yaml 
pod/mysql created
[root@k8s-master two-pod]# kubectl -n demo get po
NAME    READY   STATUS    RESTARTS   AGE
mysql   1/1     Running   0          117s

# 检查mysql环境变量是否注入成功
[root@k8s-master two-pod]# kubectl create -f mysql-with-config.yaml 
pod/mysql created
[root@k8s-master two-pod]# kubectl -n demo exec -it mysql bash
root@k8s-slave1:/# env | grep MYSQL_USER
MYSQL_USER=root
root@k8s-slave1:/# env | grep MYSQL_PASSWD
MYSQL_PASSWD=123456

# 单独创建myblog pod
[root@k8s-master two-pod]# kubectl create -f myblog.yaml

# 检查myblog环境变量是否注入成功
[root@k8s-master two-pod]#  kubectl -n demo exec -it myblog bash
[root@myblog myblog]# env | grep MYSQL_HOST
MYSQL_HOST=192.168.56.20
[root@myblog myblog]# env | grep MYSQL_PORT
MYSQL_PORT=3306
[root@myblog myblog]# env | grep MYSQL_PASSWD
MYSQL_PASSWD=123456
[root@myblog myblog]# env | grep MYSQL_USER
MYSQL_USER=root

# 检查pod状态
[root@k8s-master two-pod]# kubectl -n demo get po -o wide
NAME     READY   STATUS    RESTARTS   AGE     IP              NODE         NOMINATED NODE   READINESS GATES
myblog   1/1     Running   0          2m37s   10.244.2.30     k8s-slave1   <none>           <none>
mysql    1/1     Running   0          5m4s    192.168.56.20   k8s-slave1   <none>           <none>

# 检查服务是否可以访问
[root@k8s-master two-pod]# curl 10.244.2.30:8002
<!DOCTYPE html>
<html lang="en">
<head>
...
```
### 如何编写资源yaml

1. 拿来主义，从机器中已有的资源中拿


```bash
$ kubectl -n kube-system get po,deployment,ds
```

2. 学会在官网查找， https://kubernetes.io/docs/home/ 

3. 从kubernetes-api文档中查找， https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#pod-v1-core 

4. kubectl explain 查看具体字段含义

### Pod状态与生命周期

Pod的状态如下表所示：

参见：https://kubernetes.io/zh/docs/concepts/workloads/pods/pod-lifecycle/

| 状态值            | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| Pending（悬决）   | API Server已经创建该Pod，等待调度器调度                      |
| ContainerCreating | 镜像正在创建                                                 |
| Running（运行中） | Pod内容器均已创建，且至少有一个容器处于运行状态、正在启动状态或正在重启状态 |
| Succeeded（成功） | Pod内所有容器均已成功执行退出，且不再重启                    |
| Failed（失败）    | Pod内所有容器均已退出，但至少有一个容器退出为失败状态        |
| CrashLoopBackOff  | Pod内有容器启动失败，比如配置文件丢失导致主进程启动失败      |
| Unknown（未知）   | 由于某种原因无法获取该Pod的状态，可能由于网络通信不畅导致    |

生命周期示意图：
![Podif](/images/pasted-45.png)

启动和关闭示意：
![Podof](/images/pasted-46.png)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-start-stop
  namespace: demo
  labels:
    component: demo-start-stop
spec:
  initContainers:
  - name: init
    image: busybox
    command: ['sh', '-c', 'echo $(date +%s): INIT >> /loap/timing'] #初始化容器
    volumeMounts:
    - mountPath: /loap
      name: timing
  containers:
  - name: main
    image: busybox
    command: ['sh', '-c', 'echo $(date +%s): START >> /loap/timing; 
sleep 10; echo $(date +%s): END >> /loap/timing;'] #启动业务容器,悬停十秒退出
    volumeMounts:
    - mountPath: /loap 
      name: timing
    livenessProbe:
      exec:
        command: ['sh', '-c', 'echo $(date +%s): LIVENESS >> /loap/timing']
    readinessProbe:
      exec:
        command: ['sh', '-c', 'echo $(date +%s): READINESS >> /loap/timing']
    lifecycle:
      postStart: #开始结束hook通知，在业务容器启动之后
        exec:
          command: ['sh', '-c', 'echo $(date +%s): POST-START >> /loap/timing']
      preStop:
        exec:
          command: ['sh', '-c', 'echo $(date +%s): PRE-STOP >> /loap/timing']
  volumes:
  - name: timing
    hostPath:
      path: /tmp/loap

```
**init容器阶段：**

`initContainers `  是一种专用的容器，在应用程序容器启动之前运行，可以包括一些应用程序镜像中不存在的实用工具和安装脚本，可以完成应用的必要数据初始化等工作。总的来说就是在正式的容器启动之前做一些准备工作的（例如授权目录，改变系统参数）。

特点：

- Init 容器总是运行到成功运行完为止。
- 前面的 Init 容器必须已经运行完成，才会开始运行下一个init容器，而应用程序容器时并行运行的。

参见：https://kubernetes.io/docs/concepts/workloads/pods/init-containers/



**健康检察阶段：**

`livenessProbe` 判断容器是否存活

`readinessProbe` 判断容器是否正常提供服务

**启动关闭函数回调：**

postStart/postStop回调参见：[为容器的生命周期事件设置处理函数](https://kubernetes.io/zh/docs/tasks/configure-pod-container/attach-handler-lifecycle-event/)

创建pod测试：

```bash
$ kubectl create -f demo-pod-start.yaml

## 查看demo状态
$ kubectl -n demo get po -o wide -w

## 查看调度节点的/tmp/loap/timing
$ cat /tmp/loap/timing
1620401134: INIT
1620401150: START
1620401151: POST-START
1620401152: LIVENESS
1620401152: READINESS
1620401160: END
```

>  须主动杀掉 Pod 才会触发 `pre-stop hook`，如果是 Pod 自己 Down 掉，则不会执行 `pre-stop hook` 。多用于误操作告警

### 小结

1. 实现k8s平台与特定的容器运行时解耦，提供更加灵活的业务部署方式，引入了Pod概念
2. k8s使用yaml格式定义资源文件，yaml中Map与List的语法，与json做类比
3. 通过kubectl create | get | exec | logs | delete 等操作k8s资源，必须指定namespace
4. 每启动一个Pod，为了实现网络空间共享，会先创建Infra容器，并把其他容器网络加入该容器
5. Pod数据通过给node打标签调度到指定node并持久化数据。
6. 通过livenessProbe和readinessProbe实现Pod的存活性和就绪健康检查
7. 通过requests和limit分别限定容器初始资源申请与最高上限资源申请
8. 配置参数通过configMap和Secret定义
9. 通过Pod IP访问具体的Pod服务


## 健康检查的大坑
在复盘数据库持久化时，因为健康检查的关系。mysql容器在第一次启动时会进行数据库初始化操作，往往这个时间比较漫长恰好在健康检查的阀值之外！导致我数据库初始化到一半数据库容器被重启。喵的数据库没损坏可以正常使用，只是在yaml文件中配置的启动并创建myblog库配置失效。库并没有被创建出啊来！导致python程序也启动失败。排查了数小时才发现问题😭
>建议大家不要吧数据库装在容器中。就算放到容器中也要注意健康检查等额外配置会否影响数据库初始化操作！