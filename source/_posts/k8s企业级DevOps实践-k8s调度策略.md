title: 'k8s企业级DevOps实践-k8s调度策略:NodeSelector/nodeAffinity/污点与容忍'
author: 饼铛
cover: /images/pasted-6.png
abbrlink: 1758bdeb
tags:
  - k8s
  - 调度策略
categories:
  - Web集群
date: 2021-05-09 00:54:00
---
###  为何要控制Pod应该如何调度 

- 集群中有些机器的配置高（SSD，更好的内存等），我们希望核心的服务（比如说数据库）运行在上面
- 某两个服务的网络传输很频繁，我们希望它们最好在同一台机器上 
- ......

### NodeSelector调度

 `label`是`kubernetes`中一个非常重要的概念，用户可以非常灵活的利用 label 来管理集群中的资源，POD 的调度可以根据节点的 label 进行特定的部署。 

查看节点的label：

```bash
$ kubectl get nodes --show-labels
```

为节点打label：
```bash
$ kubectl label node k8s-master disktype=ssd
```

当 node 被打上了相关标签后，在调度的时候就可以使用这些标签了，只需要在spec 字段中添加`nodeSelector`字段，里面是我们需要被调度的节点的 label。 

```yaml
...
spec:
  hostNetwork: true	# 声明pod的网络模式为host模式，效果通docker run --net=host
  volumes: 
  - name: mysql-data
    hostPath: 
      path: /opt/mysql/data
  nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
    component: mysql
  containers:
  - name: mysql
  	image: 172.21.32.6:5000/demo/mysql:5.7
...
```
测试可参见：[mysql on k8s持久化](/forward/6b4e4d76.html#Pod数据持久化)

### nodeAffinity节点亲和性调度

节点亲和性，比上面的`nodeSelector`更加灵活，它可以进行一些简单的逻辑组合，不只是简单的相等匹配 。分为两种，软策略和硬策略。

- `preferredDuringSchedulingIgnoredDuringExecution`：软策略，如果你没有满足调度要求的节点的话，Pod就会忽略这条规则，继续完成调度过程，说白了就是满足条件最好了，没有满足就忽略掉的策略。

- `requiredDuringSchedulingIgnoredDuringExecution`： 硬策略，如果没有满足条件的节点的话，就不断重试直到满足条件为止，简单说就是你必须满足我的要求，不然我就不会调度Pod。


```yaml
#要求 Pod 不能运行在20和30两个节点上，如果其他节点满足disktype=ssd的话就优先调度到这个节点上
...
spec:
      containers:
      - name: demo
        image: 172.21.32.6:5000/demo/myblog
        ports:
        - containerPort: 8002
      affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution: #硬性规定
                nodeSelectorTerms:
                - matchExpressions:
                    - key: kubernetes.io/hostname
                      operator: NotIn
                      values:
                        - 192.168.56.20
                        - 192.168.56.30
            preferredDuringSchedulingIgnoredDuringExecution: #软性规定
                - weight: 1
                  preference:
                    matchExpressions:
                    - key: disktype
                      operator: In
                      values:
                        - ssd
                        - sas
...
```
这里的匹配逻辑是 label 的值在某个列表中，现在`Kubernetes`提供的操作符有下面的几种：

- In：label 的值在某个列表中
- NotIn：label 的值不在某个列表中
- Gt：label 的值大于某个值
- Lt：label 的值小于某个值
- Exists：某个 label 存在
- DoesNotExist：某个 label 不存在

> 如果`nodeSelectorTerms`下面有多个选项的话，满足任何一个条件就可以了；如果`matchExpressions`有多个选项的话，则必须同时满足这些条件才能正常调度 Pod

### 污点(Taints)与容忍(tolerations)
对于`nodeAffinity`无论是硬策略还是软策略方式，都是调度 Pod 到预期节点上，而`Taints`恰好与之相反，如果一个节点标记为 Taints ，除非 Pod 也被标识为可以容忍污点节点，否则该 Taints 节点不会被调度Pod。

Taints(污点)是Node的一个属性，设置了Taints(污点)后，因为有了污点，所以Kubernetes是不会将Pod调度到这个Node上的。于是Kubernetes就给Pod设置了个属性Tolerations(容忍)，只要Pod能够容忍Node上的污点，那么Kubernetes就会忽略Node上的污点，就能够(不是必须)把Pod调度过去。

比如用户希望把 Master 节点保留给 Kubernetes 系统组件使用，或者把一组具有特殊资源预留给某些 Pod，则污点就很有用了，Pod 不会再被调度到 taint 标记过的节点。在[K8s集群搭建](/forward/57e2aa11.html#设置master节点是否可调度（可选）)时就利用污点与容忍特性，将master也当作了工作节点加入到了k8s集群当中

taint 标记节点举例如下：
设置污点：

```powershell
$ kubectl taint node [node_name] key=value:[effect]   
      其中[effect] 可取值： [ NoSchedule | PreferNoSchedule | NoExecute ]
       NoSchedule：一定不能被调度。
       PreferNoSchedule：尽量不要调度。
       NoExecute：不仅不会调度，还会驱逐Node上已有的Pod。
  示例：kubectl taint node k8s-master smoke=true:NoSchedule
```

去除污点：

```bash
去除指定key及其effect：
     kubectl taint nodes [node_name] key:[effect]-    #这里的key不用指定value
                
 去除指定key所有的effect: 
     kubectl taint nodes node_name key-
 
 示例：
     kubectl taint node k8s-master smoke=true:NoSchedule
     kubectl taint node k8s-master smoke:NoExecute-
     kubectl taint node k8s-master smoke-
```

污点演示：

```bash
## 给k8s-slave1打上污点，smoke=true:NoSchedule
$ kubectl taint node k8s-master smoke=true:NoSchedule
$ kubectl taint node k8s-slave1 drunk=true:NoSchedule
$ kubectl taint node k8s-slave2 perm=true:NoSchedule

此时，master节点打上了污点抽烟，slave1节点打上了污点喝酒，slave2节点打上了污点烫头。

## 扩容myblog的Pod，观察新Pod的调度情况
$ kubectl -n demo scale deploy myblog --replicas=3
$ kubectl -n demo get po -w    ## pending
NAME                      READY   STATUS    RESTARTS   AGE
myblog-749b5dbc4b-6lgwm   1/1     Running   0          66m
myblog-749b5dbc4b-jx5j2   1/1     Running   0          65m
myblog-749b5dbc4b-vtb57   0/1     Pending   0          15s
mysql-5fcb655cc9-q48f9    1/1     Running   0          156m

## 查看事件
$ kubectl -n demo describe po myblog-749b5dbc4b-vtb57
Warning  FailedScheduling  <unknown>  default-scheduler  0/3 nodes are available: 3 node(s) had taints that the pod didn't tolerate.

# 扩容的pod由于受不了三个节点的抽烟喝酒烫头污点，从而无法调度到任何一个节点😄
```

Pod容忍污点示例：`myblog/deployment/deploy-myblog-taint.yaml`
```powershell
...
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myblog
  namespace: demo
spec:
  replicas: 3   #指定Pod副本数
  selector:             #指定Pod的选择器
    matchLabels:
      app: myblog
  template:
    metadata:
      labels:   #给Pod打label
        app: myblog
    spec:
      tolerations: #设置容忍性
      - key: "smoke" 
        operator: "Equal"  #如果操作符为Exists，那么value属性可省略,不指定operator，默认为Equal
        value: "true"
        effect: "NoSchedule"
      containers:
      - name: myblog
        image: 192.168.56.10:5000/myblog:v3
        imagePullPolicy: IfNotPresent
...
```

或者在线更新
```bash
$ kubectl -n demo edit deploy myblog
```

```bash
$ kubectl apply -f deploy-myblog-taint.yaml
# 上面的编排文件中定义了myblog这个pod只容忍了抽烟污点，即master的污点 应用之后，我们检查一下调度情况

$ kubectl -n demo get po -o wide
NAME                      READY   STATUS    RESTARTS   AGE     IP              NODE 
myblog-7fc47887f9-h5529   1/1     Running   0          2m56s   10.244.0.4      k8s-master 
myblog-7fc47887f9-k85mr   1/1     Running   0          3m27s   10.244.0.2      k8s-master
myblog-7fc47887f9-v6qbf   1/1     Running   0          3m13s   10.244.0.3      k8s-master
mysql-5fcb655cc9-q48f9    1/1     Running   0          170m    192.168.56.20   k8s-slave1 

发现所有的myblogpod 和 其副本都调度到了master节点上面
```

```yaml
spec:
      containers:
      - name: demo
        image: 172.21.32.6:5000/demo/myblog
      tolerations:
        - operator: "Exists"
```