title: ELK-Logstah 定义管道解析Nginx日志传递至Elasticsearch
author: 饼铛
cover: /images/img-156.png
tags:
  - ELK
  - Logstash
  - Nginx
categories:
  - Web集群
abbrlink: 47eea66c
date: 2021-04-12 09:55:00
---
通过filebeat读取日志后传送至logstash进行处理，处理完成再保存在elasticsearch中。其中最重要的一步就是logstash的处理，我们需要根据日志的格式编写相关的匹配代码，以便logstash进行匹配处理。

在这里我使用过滤插件中的Grok插件，具体技术文档请点击以下链接：
https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html

在编写grok捕获规则时，可以使用以下网站进行辅助：
https://grokdebug.herokuapp.com/

相关的语法可以参考以下GitHub页面：
https://github.com/elastic/logstash/blob/v1.4.2/patterns/grok-patterns

Logstash Reference [7.12] » Filter plugins 
https://www.elastic.co/guide/en/logstash/current/filter-plugins.html

## nginx日志分析

```日志配置
'$remote_addr - $remote_user [$time_local] "$request" $http_host ' 
'$status $body_bytes_sent "$http_referer" '
'"$http_user_agent" "$http_x_forwarded_for" '
'$upstream_addr $upstream_status $upstream_cache_status "$upstream_http_content_type" $upstream_response_time > $request_time';
```


```nginxlog
110.110.110.110 - - [18/Jun/2020:18:36:51 +0800] "GET /forward/61316209.html HTTP/1.1" pincheng.org 200 158441 "https://pincheng.org/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36" "120.120.120.120" 127.0.0.1:8080 200 MISS "text/html; charset=UTF-8" 1.884 > 2.189
```

字段分析：
用以记录客户端的ip地址:
`$remote_addr 110.110.110.110`

用以记录短破折号，无意义`-`

用来记录客户端用户名称(Nginx用户认证):
`$remote_user -`

用来记录访问时间与时区:
`$time_local [18/Jun/2020:18:36:51 +0800]`

用来记录请求的url与http协议:
`$request "GET /forward/61316209.html  HTTP/1.1"`

用来记录请求地址：
`$http_host pincheng.org`

用来记录请求状态成功是200:
`$status 200`

记录发送给客户端文件主体内容大小:
`$body_bytes_sent 158441`

用来记录从那个页面链接访问过来的:
`$http_referer "https://pincheng.org/"`

记录客户端浏览器的相关信息:
`$http_user_agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36"`

记录前端代理时HTTP 客户端的真实 IP
`$http_x_forwarded_for "-"`

记录后台upstream的地址，即真正提供服务的主机地址
`$upstream_addr 127.0.0.1:8080`

记录upstream状态
`$upstream_status 200`

记录是否命中缓存
`$upstream_cache_status MISS`

记录页面类型
`$upstream_http_content_type "text/html; charset=UTF-8"`

记录从Nginx向后端建立连接开始到接受完数据然后关闭连接为止的时间/s
`$upstream_response_time 1.884`

记录从接受用户请求的第一个字节到发送完响应数据的时间/s
`$request_time 2.189`



## 筛选处理

输入和输出在logstash配置中是很简单的一步，而对数据进行匹配处理则显得异常复杂。匹配当行日志是入门水平需要掌握的，而多行甚至不规则的日志则可能需要ruby的协助。

```bash
%{IPORHOST:client_ip} - %{USER:auth} \[%{HTTPDATE:timestamp}\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:http_version})?|-)\" (%{IPORHOST:domain}|%{URIHOST:domain}|-) %{NUMBER:response} %{NUMBER:bytes} %{QS:referrer} %{QS:agent} \"(%{IP:x_forword}|%{GREEDYDATA:x_forword})\" (\[|)(%{URIHOST:upstream_host}|%{NOTSPACE:upstream_host}|-)(\]|) %{NUMBER:upstream_host_status} (%{WORD:upstream_cache_status}|-) %{QS:upstream_content_type} (%{NUMBER:upstream_response_time}|-) > %{NUMBER:request_time}
```

输入和输出在logstash配置中是很简单的一步，而对数据进行匹配处理则显得异常复杂。匹配当行日志是入门水平需要掌握的，而多行甚至不规则的日志则可能需要ruby的协助。
![elk](/images/pasted-26.png)


| grok-patterns                                        | 解释                                     | 适用于                                     |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| IPORHOST (?:%{HOSTNAME}&#124;%{IP})                  | 匹配主机名或IP                           | 匹配客户端ip或主机名                       |
| USER %{USERNAME}                                     | 匹配用户名                               | 匹配用户名                                 |
| HTTPDATE %{MONTHDAY}/%{MONTH}/%{YEAR}:%{TIME} %{INT} | 匹配带时区的日期                         | 匹配http请求头中的时间                     |
| WORD \b\w+\b                                         | 匹配一个单词                             | 匹配请求类型、缓存状态码                   |
| NOTSPACE \S+                                         | 匹配非空白就匹配(没有空格的一段)         | 匹配请求URL                                |
| NUMBER (?:%{BASE10NUM})                              | 匹配十进制数字(包括整数、小数)           | 匹配http版本、状态码、发送字节数、响应时间 |
| URIHOST %{IPORHOST}(?::%{POSINT:port})?              | 匹配（主机名或IP）或（带端口的域名或ip） | 匹配请求的域名                             |
| QS %{QUOTEDSTRING}                                   | 匹配用双引号包裹的数据                   | 匹配来源页面、客户端UA                     |

## logstash

安装

```bash
[root@es-node03 /application]# wget https://repo.huaweicloud.com/logstash/7.4.0/logstash-7.4.0.tar.gz
[root@es-node03 /application]# tar -xf logstash-7.4.0.tar.gz 
[root@es-node03 /application]# ls
logstash-7.4.0  logstash-7.4.0.tar.gz
[root@es-node03 /application]# cd logstash-7.4.0/
```

里面应该有一个有配置监听信息的文件：

```bash
[root@es-node03 /application/logstash-7.4.0]# cat config/logstash-sample.conf 
# Sample Logstash configuration for creating a simple
# Beats -> Logstash -> Elasticsearch pipeline.

input {
  beats {
    port => 5044
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "%{[@metadata][beat]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
    #user => "elastic"
    #password => "changeme"
  }
}
```



新建自己的配置文件

```bash
vim config/wikibit_ngx.conf
input {
  beats {
  port => 9999
  codec=> plain{charset=>"UTF-8"}
  }
}

filter {
     mutate {
         add_field => {"[@metadata][target_index]" => ""}
     }
     if "wikibit_ngx_access" in [tags] {
         grok {
            match => { "message" => "%{IPORHOST:client_ip} - %{USER:auth} \[%{HTTPDATE:timestamp}\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:http_version})?|-)\" (%{IPORHOST:domain}|%{URIHOST:domain}|-) %{NUMBER:response} %{NUMBER:bytes} %{QS:referrer} %{QS:agent} \"(%{IP:x_forword}|%{GREEDYDATA:x_forword})\" (\[|)(%{URIHOST:upstream_host}|%{NOTSPACE:upstream_host}|-)(\]|) %{NUMBER:upstream_host_status} (%{WORD:upstream_cache_status}|-) %{QS:upstream_content_type} (%{NUMBER:upstream_response_time}|-) > %{NUMBER:request_time}" }
         }
         date {
             match => [ "timestamp" , "dd/MMM/YYYY:HH:mm:ss Z" ]
         }

         mutate {
             update => {"[@metadata][target_index]" => "wikibit_ngx_access-%{+YYYY.MM}"}
         }
     }
}
output {
    elasticsearch {
     index => "%{[@metadata][target_index]}"
     hosts => ["192.168.200.148:9200"]
     user =>elastic
     password =>elastic1234
    }
}
```

- date：将日志中的时间作为logstash处理的时间

配置文件中还有以下这句判断：`if "wikibit_ngx_access" in [tags]`

因为各种各样的日志都通过logstash分析，所以在filebeat添加了自定义tags以便区分不同的log：

```bash
[root@web conf.d]# cat /etc/filebeat/filebeat.yml
 
########################################
- input_type: log
  paths:
    - /var/log/nginx/access.log
  tags: wikibit_ngx_access
########################################
```

完成上面这一切后，请通过以下命令测试并重新加载logstash和：

```bash
[root@web conf.d]# /application/logstash-7.4.0/bin/logstash -f config/wikibit_ngx.conf
```

## 结果

![elk](/images/pasted-27.png)

> 编写匹配代码是最麻烦的一步，要经过很多次的调整才能完美匹配。


特别鸣谢资深软件系统架构师：**Evan**