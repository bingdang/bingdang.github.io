title: k8s企业级DevOps实践-workload(工作负载)、副本保障机制、Pod驱逐策略、服务的滚动更新和回滚
author: 饼铛
cover: /images/pasted-6.png
abbrlink: dc57d8c4
tags:
  - k8s
  - workload
categories: []
date: 2021-05-08 22:16:00
---
只使用Pod, 将会面临如下需求:

1. 业务应用如何启动多个副本
2. Pod重建后IP会变化，外部如何访问Pod服务
3. 运行业务Pod的某个节点挂了，如何自动帮我把Pod转移到集群中的可用节点启动起来
4. 我的业务应用功能是收集节点监控数据,需要把Pod运行在k8s集群的各个节点上

## Workload (工作负载)

控制器又称工作负载是用于实现管理pod的中间层，确保pod资源符合预期的状态，pod的资源出现故障时，会尝试 进行重启，当根据重启策略无效，则会重新新建pod的资源。 

![Workload](/images/pasted-47.png)

- ReplicaSet: 代用户创建指定数量的pod副本数量，确保pod副本数量符合预期状态，并且支持滚动式自动扩容和缩容功能
- Deployment：工作在ReplicaSet之上，用于管理无状态应用，目前来说最好的控制器。支持滚动更新和回滚功能，还提供声明式配置
- DaemonSet：用于确保集群中的每一个节点只运行特定的pod副本，通常用于实现系统级后台任务。比如ELK服务
- Job：只要完成就立即退出，不需要重启或重建
- Cronjob：周期性任务控制，不需要持续后台运行
- StatefulSet：管理有状态应用

### Deployment

`myblog/deployment/deploy-mysql.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: #定义资源的元数据信息
  name: mysql #定义资源的名称，在同一个namespace空间中必须是唯一的
  namespace: demo #定义所属ns
spec:
  replicas: 1   #指定Pod副本数
  selector:     #指定Pod的选择器
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:   #给Pod打label
        app: mysql
    spec:
      hostNetwork: true # 声明pod的网络模式为host模式，效果通docker run --net=host
      volumes: 
      - name: mysql-data #容器持久化目录
        hostPath: 
          path: /opt/mysql/data
      nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
        component: mysql
      containers:
      - name: mysql
        image: 192.168.56.10:5000/mysql:5.7-utf8
        args:
        - "--character-set-server=utf8"
        - "--collation-server=utf8_general_ci"    #  指定字符编码
        ports: #暴露端口
        - containerPort: 3306
        env: #获取ns内secret中定义的值
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
        resources: #容器资源限制相关
          requests:
            memory: 100Mi
            cpu: 50m
          limits:
            memory: 500Mi
            cpu: 100m
        readinessProbe: #容器健康检查相关
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
        - name: mysql-data #容器内挂载点
          mountPath: /var/lib/mysql
```

`deploy-myblog.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myblog
  namespace: demo
spec:
  replicas: 1   #指定Pod副本数
  selector:             #指定Pod的选择器
    matchLabels:
      app: myblog
  template:
    metadata:
      labels:   #给Pod打label
        app: myblog
    spec:
      containers:
      - name: myblog
        image: 192.168.56.10:5000/myblog:v2
        imagePullPolicy: IfNotPresent
        env:
        - name: MYSQL_HOST
          valueFrom:
            configMapKeyRef:
              name: myblog
              key: MYSQL_HOST
        - name: MYSQL_PORT
          valueFrom:
            configMapKeyRef:
              name: myblog
              key: MYSQL_PORT
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
          periodSeconds: 15     # 执行探测的频率
          timeoutSeconds: 2             # 探测超时时间
        readinessProbe: 
          httpGet: 
            path: /blog/index/
            port: 8002
            scheme: HTTP
          initialDelaySeconds: 10 
          timeoutSeconds: 2
          periodSeconds: 15
```

创建测试：
```bash
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME     READY   STATUS    RESTARTS   AGE    IP              NODE         NOMINATED NODE   READINESS GATES
myblog   1/1     Running   3          10d    10.244.2.40     k8s-slave1   <none>           <none>
mysql    1/1     Running   2          3d2h   192.168.56.20   k8s-slave1   <none>           <none>

#删除旧的mysql pod
[root@k8s-master deployment]# kubectl -n demo delete po mysql
pod "mysql" deleted

#创建新的mysql pod
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME     READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
myblog   1/1     Running   3          10d   10.244.2.40   k8s-slave1   <none>           <none>
[root@k8s-master deployment]# vi deploy-mysql.yaml 
[root@k8s-master deployment]# kubectl create -f deploy-mysql.yaml
deployment.apps/mysql created

#检查状态
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
myblog                   1/1     Running   3          10d   10.244.2.40     k8s-slave1   <none>           <none>
mysql-5fcb655cc9-q48f9   1/1     Running   0          11s   192.168.56.20   k8s-slave1   <none>           <none>

#创建myblog pod
[root@k8s-master deployment]# kubectl apply -f deploy-myblog.yaml 
deployment.apps/myblog created

#检查状态
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME                      READY   STATUS    RESTARTS   AGE    IP              NODE         NOMINATED NODE   READINESS GATES
myblog                    1/1     Running   4          10d    10.244.2.40     k8s-slave1   <none>           <none>
myblog-749b5dbc4b-fvsk9   1/1     Running   0          15s    10.244.2.43     k8s-slave1   <none>           <none>
mysql-5fcb655cc9-q48f9    1/1     Running   0          9m7s   192.168.56.20   k8s-slave1   <none>           <none>

#删除旧的 myblog pod
[root@k8s-master deployment]# kubectl -n demo delete po myblog
pod "myblog" deleted
```

### 查看Deployment
```bash
# kubectl api-resources
[root@k8s-master deployment]# kubectl -n demo get deploy
NAME     READY   UP-TO-DATE   AVAILABLE   AGE
myblog   1/1     1            1           11m
mysql    1/1     1            1           20m

  * `NAME` 列出了集群中 Deployments 的名称。
  * `READY`显示当前正在运行的副本数/期望的副本数。
  * `UP-TO-DATE`显示已更新以实现期望状态的副本数。
  * `AVAILABLE`显示应用程序可供用户使用的副本数。
  * `AGE` 显示应用程序运行的时间量。
  
[root@k8s-master deployment]# kubectl -n demo get po
NAME                      READY   STATUS    RESTARTS   AGE
myblog-749b5dbc4b-fvsk9   1/1     Running   0          14m
mysql-5fcb655cc9-q48f9    1/1     Running   0          22m

#检查副本集状态
[root@k8s-master deployment]# kubectl -n demo get rs
NAME                DESIRED   CURRENT   READY   AGE
myblog-749b5dbc4b   1         1         1       16m
mysql-5fcb655cc9    1         1         1       25m

DESIRED 期望的副本集
CURRENT 当前的副本集
READY 准备好的副本集
```

### 副本保障机制
controller实时检测pod状态，并保障副本数一直处于期望的值。
```bash
$ kubectl -n demo get po -o wide
NAME                      READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
myblog-749b5dbc4b-fvsk9   1/1     Running   0          24m   10.244.2.43     k8s-slave1   <none>           <none>
mysql-5fcb655cc9-q48f9    1/1     Running   0          33m   192.168.56.20   k8s-slave1   <none>           <none>

## 删除pod，观察pod状态变化
$ kubectl -n demo delete pod myblog-749b5dbc4b-fvsk9

# 观察pod
$ kubectl get pods -o wide
NAME                      READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
myblog-749b5dbc4b-5xmsf   1/1     Running   0          85s   10.244.2.44     k8s-slave1   <none>           <none>
mysql-5fcb655cc9-q48f9    1/1     Running   0          35m   192.168.56.20   k8s-slave1   <none>           <none>

## 设置两个副本, 或者通过kubectl -n demo edit deploy myblog的方式，最好通过修改文件，然后apply的方式，这样yaml文件可以保持同步
$ kubectl -n demo scale deploy myblog --replicas=2
deployment.extensions/myblog scaled

$ vi deploy-myblog.yaml
...
spec:
  replicas: 2   #指定Pod副本数
...

$ kubectl apply -f deploy-myblog.yaml 

# 观察pod
$ kubectl get pods -o wide
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME                      READY   STATUS    RESTARTS   AGE  
myblog-749b5dbc4b-5xmsf   1/1     Running   0          4m52s 
myblog-749b5dbc4b-jhmc5   1/1     Running   0          27s 
mysql-5fcb655cc9-q48f9    1/1     Running   0          38m  
```

### Pod驱逐策略
 K8S 有个特色功能叫 pod eviction，它在某些场景下如节点 NotReady，或者资源不足时，把 pod 驱逐至其它节点，这也是出于业务保护的角度去考虑的。

1. Kube-controller-manager: 周期性检查所有节点状态，当节点处于 NotReady 状态超过一段时间后，驱逐该节点上所有 pod。停掉kubelet
   - `pod-eviction-timeout`：NotReady 状态节点超过该时间后，执行驱逐，默认 5 min

2. Kubelet: 周期性检查本节点资源，当资源不足时，按照优先级驱逐部分 pod
   - `memory.available`：节点可用内存
   - `nodefs.available`：节点根盘可用存储空间 默认80%
   - `nodefs.inodesFree`：节点inodes可用数量
   - `imagefs.available`：镜像存储盘的可用空间
   - `imagefs.inodesFree`：镜像存储盘的inodes可用数量

### 服务滚动更新

修改dockerfile，重新打tag模拟服务更新。

更新方式：

- 修改yaml文件，使用`kubectl -n demo apply -f deploy-myblog.yaml`来应用更新
- `kubectl -n demo edit deploy myblog`在线更新
- `kubectl set image deploy myblog myblog=192.168.56.10:5000/myblog:v3 --record` 

修改文件测试：

```bash
$ vi mybolg/blog/template/index.html

$ docker build . -t 192.168.56.10:5000/myblog:v3 -f Dockerfile_optimized
$ docker push 192.168.56.10:5000/myblog:v3
```

#### 滚动更新策略

```yaml
...
spec:
  replicas: 2	#指定Pod副本数
  selector:		#指定Pod的选择器
    matchLabels:
      app: myblog
  strategy:
    rollingUpdate:
      maxSurge: 25% #滚动更新时最大激增的比例，不满足就向上取整。也可以为固定的数值如 1、2、3
      maxUnavailable: 25% #滚动更新时最大不可用的比例，不满足就向下取整。这里计算后应该为0
    type: RollingUpdate		#指定更新方式为滚动更新，默认策略，通过get deploy yaml查看
    ...
```

![uppod](/images/pasted-48.png)

策略控制：

- maxSurge：最大激增数, 指更新过程中, 最多可以比replicas预先设定值多出的pod数量, 可以为固定值或百分比,默认为desired Pods数的25%。计算时向上取整(比如3.4，取4)，更新过程中最多会有replicas + maxSurge个pod
- maxUnavailable： 指更新过程中, 最多有几个pod处于无法服务状态 , 可以为固定值或百分比，默认为desired Pods数的25%。计算时向下取整(比如3.6，取3)

*在Deployment rollout时，需要保证Available(Ready) Pods数不低于 desired pods number - maxUnavailable; 保证所有的非异常状态Pods数不多于 desired pods number + maxSurge*。

以myblog为例，使用默认的策略，更新过程:

1. maxSurge 25%，2个实例，向上取整，则maxSurge为1，意味着最多可以有2+1=3个Pod，那么此时会新创建1个ReplicaSet，RS-new，把副本数置为1，此时呢，副本控制器就去创建这个新的Pod
2. 同时，maxUnavailable是25%，副本数2*25%，向下取整，则为0，意味着，滚动更新的过程中，不能有少于2个可用的Pod，因此，旧的Replica（RS-old）会先保持不动，等RS-new管理的Pod状态Ready后，此时已经有3个Ready状态的Pod了，那么由于只要保证有2个可用的Pod即可，因此，RS-old的副本数会有2个变成1个，此时，会删掉一个旧的Pod
3. 删掉旧的Pod的时候，由于总的Pod数量又变成2个了，因此，距离最大的3个还有1个Pod可以创建，所以，RS-new把管理的副本数由1改成2，此时又会创建1个新的Pod，等RS-new管理了2个Pod都ready后，那么就可以把RS-old的副本数由1置为0了，这样就完成了滚动更新

检查滚动更新事件
```bash
$ kubectl -n demo describe deploy myblog
  Normal  ScalingReplicaSet  37m   deployment-controller  Scaled up replica set myblog-749b5dbc4b to 2
  Normal  ScalingReplicaSet  20m   deployment-controller  Scaled up replica set myblog-785dbb55cc to 1 #启动一个新pod
  Normal  ScalingReplicaSet  19m   deployment-controller  Scaled down replica set myblog-749b5dbc4b to 1 #关闭一个旧pod
  Normal  ScalingReplicaSet  19m   deployment-controller  Scaled up replica set myblog-785dbb55cc to 2 #再起一个新pod
  Normal  ScalingReplicaSet  19m   deployment-controller  Scaled down replica set myblog-749b5dbc4b to 0 #再关一个旧pod

# 正在更新中
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME                      READY   STATUS        RESTARTS   AGE  
myblog-749b5dbc4b-5xmsf   1/1     Terminating   0          22m   
myblog-749b5dbc4b-jhmc5   1/1     Terminating   0          17m  
myblog-785dbb55cc-ljjf7   1/1     Running       0          46s 
myblog-785dbb55cc-r7hpf   1/1     Running       0          21s  
mysql-5fcb655cc9-q48f9    1/1     Running       0          56m  

# 更新完毕
[root@k8s-master deployment]# kubectl -n demo get po -o wide
NAME                      READY   STATUS    RESTARTS   AGE  
myblog-785dbb55cc-ljjf7   1/1     Running   0          24m 
myblog-785dbb55cc-r7hpf   1/1     Running   0          23m  
mysql-5fcb655cc9-q48f9    1/1     Running   0          79m  
```

### 服务回滚

通过滚动升级的策略可以平滑的升级Deployment，若升级出现问题，需要最快且最好的方式回退到上一次能够提供正常工作的版本。为此K8S提供了回滚机制。

**revision**：更新应用时，K8S都会记录当前的版本号，即为revision，当升级出现问题时，可通过回滚到某个特定的revision，默认配置下，K8S只会保留最近的几个revision，可以通过Deployment配置文件中的spec.revisionHistoryLimit属性增加revision数量，默认是10。

查看当前：

```yaml
$ kubectl -n demo rollout history deploy myblog ##CHANGE-CAUSE为空
$ kubectl delete -f deploy-myblog.yaml    ## 方便演示到具体效果，删掉已有deployment
```

记录回滚：

```bash
$ kubectl create -f deploy-myblog.yaml --record
#此时创建的deploy pod版本为v2

$ kubectl -n demo set image deploy myblog myblog=192.168.56.10:5000/myblog:v3 --record=true
```

查看deployment更新历史：

```bash
$ kubectl -n demo rollout history deploy myblog
deployment.apps/myblog 
REVISION  CHANGE-CAUSE
1         kubectl create --filename=deploy-myblog.yaml --record=true
2         kubectl set image deploy myblog myblog=192.168.56.10:5000/myblog:v3 --namespace=demo --record=true

REVISION即为版本信息。
```

回滚到具体的REVISION:

```bash
# 当前REVISION为2回滚到1
$ kubectl -n demo rollout undo deploy myblog --to-revision=1
deployment.extensions/myblog rolled back

# 访问应用测试
```

