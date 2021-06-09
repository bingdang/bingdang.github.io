---
title: MySQL-DQL
author: 饼铛
tags:
  - MySQL
  - SQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: cb26d424
date: 2019-04-15 11:52:00
---
## 环境准备：
**world库备份下载：[网页连接](https://www.lanzous.com/ib6lytg)**
```bash
mysql> show tables;
+-----------------+
| Tables_in_world |
+-----------------+
| city            |
| country         |
| countrylanguage |
+-----------------+
3 rows in set (0.00 sec)

mysql> desc city;
+-------------+----------+------+-----+---------+----------------+
| Field       | Type     | Null | Key | Default | Extra          |
+-------------+----------+------+-----+---------+----------------+
| ID          | int(11)  | NO   | PRI | NULL    | auto_increment |
| Name        | char(35) | NO   |     |         |                |
| CountryCode | char(3)  | NO   | MUL |         |                |
| District    | char(20) | NO   |     |         |                |
| Population  | int(11)  | NO   |     | 0       |                |
+-------------+----------+------+-----+---------+----------------+
5 rows in set (0.00 sec)

mysql> desc country;
+----------------+--------------------------------------------------------------------------------------+------+-----+---------+-------+
| Field          | Type                                                                                  | Null | Key | Default | Extra |
+----------------+--------------------------------------------------------------------------------------+------+-----+---------+-------+
| Code           | char(3)                                                                               | NO   | PRI |         |       |
| Name           | char(52)                                                                              | NO   |     |         |       |
| Continent      | enum('Asia','Europe','North America','Africa','Oceania','Antarctica','South America') | NO   |     | Asia    |       |
| Region         | char(26)                                                                              | NO   |     |         |       |
| SurfaceArea    | float(10,2)                                                                           | NO   |     | 0.00    |       |
| IndepYear      | smallint(6)                                                                           | YES  |     | NULL    |       |
| Population     | int(11)                                                                               | NO   |     | 0       |       |
| LifeExpectancy | float(3,1)                                                                            | YES  |     | NULL    |       |
| GNP            | float(10,2)                                                                           | YES  |     | NULL    |       |
| GNPOld         | float(10,2)                                                                           | YES  |     | NULL    |       |
| LocalName      | char(45)                                                                              | NO   |     |         |       |
| GovernmentForm | char(45)                                                                              | NO   |     |         |       |
| HeadOfState    | char(60)                                                                              | YES  |     | NULL    |       |
| Capital        | int(11)                                                                               | YES  |     | NULL    |       |
| Code2          | char(2)                                                                               | NO   |     |         |       |
+----------------+--------------------------------------------------------------------------------------+------+-----+---------+-------+
15 rows in set (0.00 sec)

mysql> desc countrylanguage;
+-------------+---------------+------+-----+---------+-------+
| Field       | Type          | Null | Key | Default | Extra |
+-------------+---------------+------+-----+---------+-------+
| CountryCode | char(3)       | NO   | PRI |         |       |
| Language    | char(30)      | NO   | PRI |         |       |
| IsOfficial  | enum('T','F') | NO   |     | F       |       |
| Percentage  | float(4,1)    | NO   |     | 0.0     |       |
+-------------+---------------+------+-----+---------+-------+
4 rows in set (0.00 sec)

```

## 1.DQL查询：
### 1.1.SELECT
#### (1)作用:获取MySQL中的数据行
#### (2)单独使用select 
```bash
select @@xxxx;获取参数信息。
mysql> select @@port;  
mysql> show variables like '%innodb%';  //模糊查询
```
#### (3)select 函数();
```bash
mysql> select database();  //当前库
mysql> select now();  //当前时间
mysql> select version();  //当前数据库版本
```
---
### 1.2 SQL92标准的使用语法 
### 1.3 select语法执行顺序（单表）*为必带。
```bash
select开始 ----> 
from子句* --->
where子句---> 
group by子句--->
select后执行条件--->
having子句 ----> 
order by ---->
limit
```

![select 执行顺序](/images/img-28.png)
---
### SELECT 语句应用
#### 声明：
* **以下部分语句仅为演示作用，不代表生产操作。**

#### 单表查询练习环境：world数据库下表介绍
`SHOW TABLES FROM world;`
* #`city`(城市): `DESC city;`
* #`id`: 自增的无关列，数据行的需要
* #`NAME`: 城市名字 
* #`countrycode`：城市所在的国家代号，CHN,USA,JPN。。。。
* #`district`: 城市的所在的区域，中国是省的意思，美国是洲的意思
* #`population`: 城市的人口数量
* #**说明**: 此表是历史数据，仅供学习交流使用。
---
#### SELECT *
**#适合表数据行较少，生产中使用较少。**
```bash
SELECT * FROM city;
```

**#例子：查询name和population的所有值**
```bash
SELECT name,Population FROM city;
SELECT NAME,population FROM world.city;
```
---
#### where
##### (1).WHERE 配合等值查询
#查询中国的城市信息
 ```bash
 SELECT * 
 FROM world.city 
 WHERE CountryCode='CHN';
 ```
 
#查询美国的城市信息
 ```bash
 SELECT * 
 FROM world.city 
 WHERE CountryCode='USA';
 ```
 
#安徽各市人口查看
```bash
SELECT name,Population 
FROM world.city 
WHERE District='Anhui';
```

---

##### (2).WHERE 配合不等值查询(> < >= <= != <>)
#查询人口小于等于1000的城市
 ```bash
 SELECT * 
 FROM world.city 
 WHERE Population<=1000;
 ```

---
##### (3).WHERE 配合模糊(LIKE)
#查询国家代号以C开头的
 ```bash
 SELECT * 
 FROM world.city 
 WHERE CountryCode LIKE 'C%';
 ```
 
#生产中不允许%出现在前面，效率很低。不走索引。
``` bash
#SELECT * 
FROM world.city 
WHERE CountryCode LIKE '%C%';
```

---
##### (4).WHERE 配合逻辑连接符(AND OR)
#查询城市人口10000-20000的城市。
 ```bash
 SELECT * 
 FROM world.city 
 WHERE Population >= 10000 AND Population <= 20000;
 SELECT * 
 FROM world.city 
 WHERE Population BETWEEN 10000 AND 20000;
 ```
 
#查询中国或美国的城市信息
```bash
SELECT * 
FROM world.city 
WHERE CountryCode='CHN' OR CountryCode='USA';`
```
##### (5).UNION/UNION ALL
建议改写为（聚合）:
 ```bash
 SELECT * FROM world.city WHERE CountryCode='CHN'
 UNION ALL
 SELECT * FROM world.city WHERE CountryCode='USA';
 #UNION //用于聚合语句输出的结果去重
 #UNION ALL //不去重
 ```
--- 
#### 1.GROUP BY 配合聚合函数应用
##### 聚合函数：
```bash
	AVG() //计算平均值
	COUNT()  //c
	SUM()  //所有列之和
	MAX() //最大值
	MIN()  //最小值
	GROUP_CONCAT()  //列转行
    distinct()  //去重
```

---
##### (1):SUM() 所有列之和
#统计一下世界上每个国家的总人口数
```bash
SELECT CountryCode,SUM(population) 
FROM world.city 
GROUP BY CountryCode;
```
#统计一下中国每个省的总人口数
```bash
SELECT District,SUM(Population) 
FROM world.city 
WHERE CountryCode='CHN' 
GROUP BY District;
```

#统计一下中国每个省的总人口数

---
##### (2):COUNT() 某列下数据行个数
#统计每个国家的城市个数
```bash
SELECT CountryCode,COUNT(id) FROM world.city GROUP BY CountryCode;
	 #1.拿什么站队
	 GROUP BY CountryCode;  //按国家
	 #2.统计对象
	 城市id或name 
	 #3.统计什么
	 COUNT(id)
```
---
##### (3):GROUP_CONCAT() 列转行
#统计显示每个国家省的名字列表 
```bash
SELECT CountryCode,GROUP_CONCAT(district) 
FROM world.city 
GROUP BY CountryCode;
```

#统计中国每个省的城市名列表
```bash
SELECT District,GROUP_CONCAT(Name) 
FROM world.city 
WHERE CountryCode='CHN' 
GROUP BY District;
```

---
##### (4):AVG() 计算平均值
#统计一下中国每个省的平均口数
```bash
SELECT District,AVG(Population) 
FROM world.city 
WHERE CountryCode='CHN' 
GROUP BY District;
```

---
##### (5)HAVING 对结果集进行再次过滤
#中国总人口数大于1000万的
```bash
SELECT District,SUM(Population) 
FROM world.city 
WHERE CountryCode='CHN' 
GROUP BY District
HAVING SUM(Population)>10000000;
```

---
##### (6)ORDER BY 再排序
#中国城市人口数，降序排序
```bash
 SELECT name,Population 
 FROM world.city 
 WHERE CountryCode='CHN' 
 ORDER BY Population DESC;
```
```bash
#中国每个省的人口数，降序排序
 SELECT District,SUM(Population) 
 FROM world.city 
 WHERE CountryCode='CHN' 
 GROUP BY District 
 ORDER BY SUM(Population) DESC;
```

---
##### (7)指定结果集范围：LIMIT
```bash
 LIMIT 5,5; #跳过五名，显示五名。
 #或者 LIMIT 5 OFFSET 5; 显示5行，跳过五行。
```
#中国城市人口数，降序排序的前五名
```bash
 SELECT name,Population 
 FROM world.city 
 WHERE CountryCode='CHN' 
 ORDER BY Population DESC
 LIMIT 5;
```
#中国城市人口数，降序排序的6-10名
```bash
 SELECT name,Population 
 FROM world.city 
 WHERE CountryCode='CHN' 
 ORDER BY Population DESC
```

---
##### (8)distinct 去重复

#检查某列是否可建立唯一索引
![check uniq](/images/img-21.png)

##### (9)将对结果集进行再查询
```bash
select sum(单价*数量) from (select 牌子,单价,数量  from 啤酒 
union all 
select 牌子,单价,数量  from 饮料
union all 
select 牌子,单价,数量  from 矿泉水);
```

### 别名
```bash
表别名 
SELECT a.tname  ,GROUP_CONCAT(d.sname) 
FROM teacher AS a 
JOIN course AS b 
ON a.tno = b.tno
JOIN sc as c
ON b.cno = c.cno
JOIN student AS d
ON c.sno = d.sno
WHERE a.tname='oldguo' AND c.score<60
GROUP BY a.tno;

列别名
select count(distinct(name)) as 个数  from world.city;
```
