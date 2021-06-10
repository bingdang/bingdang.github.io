title: k8s企业级DevOps实践-k8s的持久化存储
author: 饼铛
cover: /images/pasted-6.png
tags:
  - k8s
categories:
  - Web集群
abbrlink: 1051b489
date: 2021-05-10 14:18:00
---
## Volume
在K8s上，Pod的生命周期可能是很短，它们会被频繁地销毁和创建，自然在容器销毁时，里面运行时新增的数据，如修改的配置及日志文件等也会被清除。解决这一问题时可以用K8s volume来持久化保存容器的数据，Volume的生命周期独立于容器，Pod中的容器可能被销毁重建，但Volume会被保留。

本质上，K8s volume是一个目录，这点和Docker volume差不多，当Volume被mount到Pod上，这个Pod中的所有容器都可以访问这个volume，在生产场景中，我们常用的类型有这几种：
- emptyDir
- hostPath
- PersistentVolume(PV) & PersistentVolumeClaim(PVC)
- StorageClass

### emptyDir
emptyDir是最基础的Volume类型，pod内的容器发生重启不会造成emptyDir里面数据的丢失，但是当pod被重启后，emptyDir数据会丢失，也就是说emptyDir与pod的生命周期是一致的，这个使用场景实际上是在生产环境某些时候，它的最实际实用是提供Pod内多容器的volume数据共享，下面会用一个实际的生产者，消费者的栗子来演示下emptyDir的作用：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: web
  name: web
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - image: nginx
        name: nginx
        resources:
          limits:
            cpu: "50m"
            memory: 20Mi
          requests:
            cpu: "50m"
            memory: 20Mi
        volumeMounts:        # 准备将pod的目录进行卷挂载
          - name: html-files  # 自定个名称，容器内可以类似这样挂载多个卷
            mountPath: "/usr/share/nginx/html"
      - name: busybox       # 在pod内再跑一个容器，每秒把当时时间写到nginx默认页面上
        image: busybox
        args:
        - /bin/sh
        - -c
        - >
           while :; do
             if [ -f /html/index.html ];then
               echo "[$(date +%F\ %T)] hello" >> /html/index.html
               sleep 1
             else
               touch /html/index.html
             fi
           done
        volumeMounts:
          - name: html-files       # 注意这里的名称和上面nginx容器保持一样，这样才能相互进行访问
            mountPath: "/html"  # 将数据挂载到当前这个容器的这个目录下
      volumes:
        - name: html-files   # 最后定义这个卷的名称也保持和上面一样
          emptyDir:             # 这就是使用emptyDir卷类型了
            medium: Memory   # 这里将文件写入内存中保存，这样速度会很快，配置为medium: "" 就是代表默认的使用本地磁盘空间来进行存储
            sizeLimit: 10Mi   # 因为内存比较珍贵，注意限制使用大小,超出10MPOD会被k8s驱逐掉
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: default
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: web 
  type: ClusterIP

//busybox运行时生产数据
//nginx运行时消费数据
[root@node1 app]# kubectl get pod -o wide
NAME                   READY   STATUS    RESTARTS   AGE     IP              NODE    NOMINATED NODE   READINESS GATES
web-7d647b7fc8-s7blv   2/2     Running   0          5h26m   10.100.104.11   node2   <none>           <none>

[root@node1 app]# curl 10.96.10.109
[2021-06-09 13:16:53] hello
[2021-06-09 13:16:54] hello
[2021-06-09 13:16:55] hello
[2021-06-09 13:16:56] hello

# web的pod的描述信息中取到docker运行时的id
[root@node1 ~]# kubectl describe  po web-7d647b7fc8-s7blv | grep "Container ID:"
    Container ID:   containerd://cb51edc831de2197840c1cd647877c2def9fa504ae24a55597455cc311f884b7
    Container ID:  containerd://ae90836c6708eb44445238e73146f20c1be7244353ebc7062499ca992e666e36

# docker inspect 上面的结果会发现两个容器挂载的同一个Volume。这就实现了pod之间临时的数据共享了
```


### hostPath
hostPath Volume 的作用是将容器运行的node上已经存在文件系统目录给mount到pod的容器。在生产中大部分应用是是不会直接使用hostPath的，因为我们并不关心Pod在哪台node上运行，而hostPath又恰好增加了pod与node的耦合，限制了pod的使用，这里只作一下了解，知道有这个东西存在即可，一般只是一些安装服务会用到，比如下面我截取了网络插件calico的部分volume配置:
```yaml
    volumeMounts:
    - mountPath: /host/driver
      name: flexvol-driver-host
......
  volumes:
......
  - hostPath:
      path: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/nodeagent~uds
      type: DirectoryOrCreate #目录不存在则创建
    name: flexvol-driver-host
```

### PV&PVC
Volume里面在生产中用的最多的PersistentVolume(持久卷，简称PV)和 PersistentVolumeClaim(持久卷消费，简称PVC)，在企业中，Volume是由存储系统的管理员来维护，他们来提供pv，pv具有持久性，生命周期独立于Pod；Pod则是由应用的开发人员来维护，如果要进行一卷挂载，那么就写一个pvc来消费pv就可以了，K8s会查找并提供满足条件的pv。

有了pvc，我们在K8s进行卷挂载就只需要考虑要多少容量了，而不用关心真正的空间是用什么存储系统做的等一些底层细节信息，pv这些只有存储管理员才应用去关心它。

K8s支持多种类型的pv，我们这里就以生产中常用的NFS来作演示（在阿里等云上的话就用NAS），生产中如果对存储要求不是太高的话，建议就用NFS，这样出问题也比较容易解决，如果有性能需求，也可以看看rook的ceph，以及Rancher的Longhorn。

####  部署NFS-SERVER
```bash
# 我们这里在10.0.1.201上安装（在生产中，大家要提供作好NFS-SERVER环境的规划）
# yum -y install nfs-utils

# 创建NFS挂载目录
# mkdir /nfs_dir
# chown nobody.nobody /nfs_dir

# 修改NFS-SERVER配置
# echo '/nfs_dir *(rw,sync,no_root_squash)' > /etc/exports

# 重启服务
# systemctl restart rpcbind.service
# systemctl restart nfs-utils.service 
# systemctl restart nfs-server.service 

# 增加NFS-SERVER开机自启动
# systemctl enable nfs-server.service 
Created symlink from /etc/systemd/system/multi-user.target.wants/nfs-server.service to /usr/lib/systemd/system/nfs-server.service.

# 验证NFS-SERVER是否能正常访问
# showmount -e 10.0.1.201
Export list for 10.0.1.201:
/nfs_dir *
```
#### 创建基于NFS的PV

首先在NFS-SERVER的挂载目录里面创建一个目录
```bash
# mkdir /nfs_dir/pv1
```
接着准备好pv的yaml配置，保存为pv1.yaml
```bash
# cat pv1.yaml 
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv1
  labels:
    type: test-claim    # 这里建议打上一个独有的标签，方便在多个pv的时候方便提供pvc选择挂载(pv唯一标识)
spec:
  capacity:
    storage: 1Gi     # <--  1
  accessModes:
    - ReadWriteOnce     # <--  2
  persistentVolumeReclaimPolicy: Recycle     # <--  3
  storageClassName: nfs     # <--  4
  nfs:
    path: /nfs_dir/pv1     # <--  5
    server: 10.0.1.201
```
1. capacity 指定 PV 的容量为 1G。
2. accessModes 指定访问模式为 ReadWriteOnce，支持的访问模式有： 
  - ReadWriteOnce – PV 能以 read-write 模式 mount 到单个节点。 
  - ReadOnlyMany – PV 能以 read-only 模式 mount 到多个节点。
  - ReadWriteMany – PV 能以 read-write 模式 mount 到多个节点。
3. persistentVolumeReclaimPolicy 指定当 PV 的回收策略为 Recycle，支持的策略有： 
 - Retain – 需要管理员手工回收。* 
 - Recycle – 清除 PV 中的数据，效果相当于执行 rm -rf /thevolume/*。 
 - Delete – 删除 Storage Provider 上的对应存储资源，例如 AWS EBS、GCE PD、Azure Disk、OpenStack Cinder Volume 等。
4. storageClassName 指定 PV 的 class 为 nfs。相当于为 PV 设置了一个分类，PVC 可以指定 class 申请相应 class 的 PV。
5. 指定 PV 在 NFS 服务器上对应的目录，这里注意，我测试的时候，需要手动先创建好这个目录并授权好，不然后面挂载会提示目录不存在 mkdir /nfsdata/pv1 && chown -R nobody.nogroup /nfsdata 。

```bash
# 创建这个pv
# kubectl apply -f pv1.yaml 
persistentvolume/pv1 created

# STATUS 为 Available，表示 pv1 就绪，可以被 PVC 申请
# kubectl get pv
NAME   CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE
pv1    1Gi        RWO            Recycle          Available           nfs                     4m45s
# pv不受命名空间限制
```

#### 创建基于NFS的PVC
```yaml
# cat pvc1.yaml 
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc1
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: nfs
  selector:
    matchLabels:
      type: test-claim
```
```bash
# kubectl apply -f pvc1.yaml          
persistentvolumeclaim/pvc1 created

# 看下pvc的STATUS为Bound代表成功挂载到pv了
# kubectl get pvc           
NAME   STATUS   VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc1   Bound    pv1      1Gi        RWO            nfs            2s

# 这个时候再看下pv，STATUS也是Bound了，同时CLAIM提示被default/pvc1消费
# kubectl get pv
NAME   CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM          STORAGECLASS   REASON   AGE
pv1    1Gi        RWO            Recycle          Bound    default/pvc1   nfs  
```
准备pod服务来挂载这个pvc，这里就以上面最开始演示用的nginx的deployment的yaml配置来作修改

```yaml
# cat nginx.yaml 
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx
  name: nginx
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx

---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        volumeMounts:    # 我们这里将nginx容器默认的页面目录挂载
          - name: html-files
            mountPath: "/usr/share/nginx/html"
      volumes:
        - name: html-files
          persistentVolumeClaim:  # 卷类型使用pvc,同时下面名称处填先创建好的pvc1
            claimName: pvc1
```
更新配置
```bash

# kubectl apply -f nginx.yaml 
service/nginx unchanged
deployment.apps/nginx configured

# 我们看到新pod已经在创建了
# kubectl get pod
NAME                     READY   STATUS              RESTARTS   AGE
nginx-569546db98-4nmmg   0/1     ContainerCreating   0          5s
nginx-f89759699-6vgr8    1/1     Running             1          23h
web-5bf769fdfc-44p7h     2/2     Running             0          113m

# 我们这里直接用svc地址测试一下
# kubectl get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.68.0.1       <none>        443/TCP   23h
nginx        ClusterIP   10.68.238.54    <none>        80/TCP    23h
web          ClusterIP   10.68.229.231   <none>        80/TCP    6h27m

# 咦，这里为什么是显示403了呢，注意，卷挂载后会把当前已经存在这个目录的文件给覆盖掉，这个和传统机器上的磁盘目录挂载道理是一样的
[root@node-1 ~]# curl 10.68.238.54
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.19.5</center>
</body>
</html>

# 我们来自己创建一个index.html页面
# echo 'hello, world!' > /nfs_dir/pv1/index.html

# 再请求下看看，已经正常了
# curl 10.68.238.54                             
hello, world!

# 我们来手动删除这个nginx的pod，看下容器内的修改是否是持久的呢？
# kubectl delete pod nginx-569546db98-4nmmg 
pod "nginx-569546db98-4nmmg" deleted

# 等待一会，等新的pod被创建好
# kubectl get pod
NAME                     READY   STATUS    RESTARTS   AGE
nginx-569546db98-99qpq   1/1     Running   0          45s

# 再测试一下，可以看到，容器内的修改现在已经被持久化了
# curl 10.68.238.54        
hello, world!

# 后面我们再想修改有两种方式，一个是exec进到pod内进行修改，还有一个是直接修改挂载在NFS目录下的文件
# echo 111 > /nfs_dir/pv1/index.html
# curl 10.68.238.54  
111
下面讲下如何回收PVC以及PV

# 这里删除时会一直卡着，我们按ctrl+c看看怎么回事（k8s的保护机制）
# kubectl delete pvc pvc1 
persistentvolumeclaim "pvc1" deleted
^C

# 看下pvc发现STATUS是Terminating删除中的状态，我分析是因为服务pod还在占用这个pvc使用中
# kubectl get pvc
NAME   STATUS        VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc1   Terminating   pv1      1Gi        RWO            nfs            21m

# 先删除这个pod
# kubectl delete pod nginx-569546db98-99qpq 
pod "nginx-569546db98-99qpq" deleted

# 再看先删除的pvc已经没有了
# kubectl get pvc
No resources found in default namespace.

# 根据先前创建pv时的数据回收策略为Recycle – 清除 PV 中的数据，这时果然先创建的index.html已经被删除了，在生产中要尤其注意这里的模式，注意及时备份数据，注意及时备份数据，注意及时备份数据
# ll /nfs_dir/pv1/
total 0

# 虽然此时pv是可以再次被pvc来消费的，但根据生产的经验，建议在删除pvc时，也同时把它消费的pv一并删除，然后再重启创建都是可以的
```

K8s对于存储解耦的设计是，pv交给存储管理员来管理，运维人员只管用pvc来消费就好，但这里我们实际还是得一起管理pv和pvc，在实际工作中，我们（存储管理员）可以提前配置好pv的动态供给StorageClass，来根据pvc的消费动态生成pv。

### StorageClass
我这是直接拿生产中用的实例来作演示，利用nfs-client-provisioner来生成一个基于nfs的StorageClass，部署配置yaml配置如下，保持为nfs-sc.yaml：
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
  namespace: kube-system

---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: nfs-client-provisioner-runner
rules:
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "delete"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "update"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["endpoints"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]

---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: run-nfs-client-provisioner
subjects:
  - kind: ServiceAccount
    name: nfs-client-provisioner
    namespace: kube-system 
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner
  apiGroup: rbac.authorization.k8s.io

---
kind: Deployment
apiVersion: apps/v1
metadata:
  name: nfs-provisioner-01
  namespace: kube-system
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-provisioner-01
  template:
    metadata:
      labels:
        app: nfs-provisioner-01
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: jmgao1983/nfs-client-provisioner:latest
          imagePullPolicy: IfNotPresent
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: nfs-provisioner-01  # 此处供应者名字供storageclass调用
            - name: NFS_SERVER
              value: 10.0.1.201   # 填入NFS的地址
            - name: NFS_PATH
              value: /nfs_dir   # 填入NFS挂载的目录
      volumes:
        - name: nfs-client-root
          nfs:
            server: 10.0.1.201   # 填入NFS的地址
            path: /nfs_dir   # 填入NFS挂载的目录

---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-boge
provisioner: nfs-provisioner-01
# Supported policies: Delete、 Retain ， default is Delete
reclaimPolicy: Retain
```
创建这个StorageClass：
```bash

# kubectl apply -f nfs-sc.yaml 
serviceaccount/nfs-client-provisioner created
clusterrole.rbac.authorization.k8s.io/nfs-client-provisioner-runner created
clusterrolebinding.rbac.authorization.k8s.io/run-nfs-client-provisioner created
deployment.apps/nfs-provisioner-01 created
  orageclass.storage.k8s.io/nfs-boge created

# 注意这个是在放kube-system的namespace下面，这里面放置一些偏系统类的服务
# kubectl -n kube-system get pod -w
NAME                                       READY   STATUS              RESTARTS   AGE
calico-kube-controllers-7fdc86d8ff-dpdm5   1/1     Running             1          24h
calico-node-8jcp5                          1/1     Running             1          24h
calico-node-m92rn                          1/1     Running             1          24h
calico-node-xg5n4                          1/1     Running             1          24h
calico-node-xrfqq                          1/1     Running             1          24h
coredns-d9b6857b5-5zwgf                    1/1     Running             1          24h
metrics-server-869ffc99cd-wfj44            1/1     Running             2          24h
nfs-provisioner-01-5db96d9cc9-qxlgk        0/1     ContainerCreating   0          9s
nfs-provisioner-01-5db96d9cc9-qxlgk        1/1     Running             0          21s

# StorageClass已经创建好了
# kubectl get sc
NAME       PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-boge   nfs-provisioner-01   Retain          Immediate           false                  37s
```
基于StorageClass创建一个pvc，动态生成的pv效果
```bash

# vim pvc-sc.yaml 
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: pvc-sc
spec:
  storageClassName: nfs-boge
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Mi
      
# kubectl  apply -f pvc-sc.yaml 
persistentvolumeclaim/pvc-sc created

# kubectl  get pvc
NAME     STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pvc-sc   Bound    pvc-63eee4c7-90fd-4c7e-abf9-d803c3204623   1Mi        RWX            nfs-boge       3s
pvc1     Bound    pv1                                        1Gi        RWO            nfs            24m

# kubectl  get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM            STORAGECLASS   REASON   AGE
pv1                                        1Gi        RWO            Recycle          Bound    default/pvc1     nfs                     49m
pvc-63eee4c7-90fd-4c7e-abf9-d803c3204623   1Mi        RWX            Retain           Bound    default/pvc-sc   nfs-boge                7s
```
修改下nginx的yaml配置，将pvc的名称换成上面的pvc-sc：
```bash
# vim nginx.yaml 
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        volumeMounts:    # 我们这里将nginx容器默认的页面目录挂载
          - name: html-files
            mountPath: "/usr/share/nginx/html"
      volumes:
        - name: html-files
          persistentVolumeClaim:
            claimName: pvc-sc
            
            
# kubectl apply -f nginx.yaml 
service/nginx unchanged
deployment.apps/nginx configured

# 这里注意下，因为是动态生成的pv，所以它的目录基于是一串随机字符串生成的，这时我们直接进到pod内来创建访问页面
# kubectl exec -it nginx-57cdc6d9b4-n497g -- bash
root@nginx-57cdc6d9b4-n497g:/# echo 'storageClass used' > /usr/share/nginx/html/index.html
root@nginx-57cdc6d9b4-n497g:/# exit

# curl 10.68.238.54                              
storageClass used

# 我们看下NFS挂载的目录
# ll /nfs_dir/
total 0
drwxrwxrwx 2 root root 24 Nov 27 17:52 default-pvc-sc-pvc-63eee4c7-90fd-4c7e-abf9-d803c3204623
drwxr-xr-x 2 root root  6 Nov 27 17:25 pv1
```
