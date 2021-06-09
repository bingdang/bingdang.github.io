---
title: DQL-多表联查
author: 饼铛
tags:
  - MySQL
  - 多表联查
categories:
  - DBA
cover: /images/img-71.png
abbrlink: d36764c1
date: 2019-04-16 16:23:00
---
### 多表联查过程
 1. **首先找到需要的关联表**
 2. **找到关联列（不同表中有关系的列）**
 3. **join on关联起来**
 4. **where进行定位**
 5. **group_by进行站队**
 6. **order by进行排序**

![test table1](/images/img-23.png)
![多表联查](/images/img-31.png)

---

### 举例
**环境准备：**[school库备份](https://lanzous.com/ib8gwkh)
#### school库介绍
##### course 课程
![course](/images/img-24.png)
##### sc 成绩
![sc](/images/img-25.png)
##### student 学生表
![student](/images/img-26.png)
##### teacher 教师表
![teacher](/images/img-27.png)

---
#### 传统连接
#例1:**[查询world库](https://pincheng.org/2019/04/15/MySQLDQL/)中人口数小于100的城市**
```bash
SELECT name,CountryCode FROM world.city WHERE Population<100;
```
---
#**人口数小于100人的城市，所在国家的国土面积（城市名，国家名，国土面积）**
多表连接查询
 **传统连接：基于WHERE条件**
 **1.找表之间的关系列**
 **2.排列查询条件**
```bash
 DESC world.country;
 SELECT name,CountryCode FROM world.city WHERE Population<100;
 SELECT name,SurfaceArea FROM world.country WHERE Code='PCN'
 合并
 SELECT world.city.name,world.country.name,world.country.SurfaceArea,world.city.Population
 FROM world.city,world.country #相关表
 WHERE world.city.CountryCode = world.country.Code #关联条件
 AND world.city.Population<100; #判断条件
```
#### 自连接(了解)
#### 内连接 *****
```bash
A   B
A.x   B.y 
```
##### 关键字：join on
##### 作用：
* 以相同的关联列将两个表进行关联，数据取交集，并形成新表。

##### 语句：
```bash
select * 
from a_table as a 
join b_table as b 
on a.a_id = b.b_id;
```
##### 说明：
* 组合两个表中的记录，返回关联字段相符的记录，也就是返回两个表的交集（阴影）部分。

![内连接](/images/img-32.png)

---
##### 过程
1. 找表之间的关系列 
2. 将两表放在join左右
3. 将关联条件了放在on后面
4. 将所有的查询条件进行罗列

```bash
语句格式：
select A.m,B.n 
from
A join B //两张表
on A.x=B.y  //表中的关系列
where 
group by 
order by 
limit 
```
---
##### 内连接改写例1:
#查询人口数量小于100人的国家名，城市名，国土面积
```bash
关联的表：world.city world.country
city;
DESC world.country;
关联列：world.city.CountryCode world.country.Code

SELECT country.name,city.name,country.SurfaceArea,city.Population
FROM 
world.city JOIN world.country
ON city.CountryCode=country.Code
WHERE world.city.Population<100;
结果：
+----------+-----------+-------------+------------+
| name     | name      | SurfaceArea | Population |
+----------+-----------+-------------+------------+
| Pitcairn | Adamstown |       49.00 |         42 |
+----------+-----------+-------------+------------+
```
##### 例2:
#1.查询张oldguo老师所教的课程名称。
```bash
关联表：course（课程表） teacher(教师表)
DESC school.course;
DESC school.teacher;

关联列：school.course.tno school.teacher.tno
关联后临时表：
+------+--------+-----+-----+--------+
| cno  | cname  | tno | tno | tname  |
+------+--------+-----+-----+--------+
| 1001 | linux  | 101 | 101 | oldboy |
| 1002 | python | 102 | 102 | hesw   |
| 1003 | mysql  | 103 | 103 | oldguo |
+------+--------+-----+-----+--------+

SELECT teacher.tname,course.cname
FROM
school.course JOIN school.teacher
ON course.tno=teacher.tno
WHERE teacher.tname='oldguo';
结果：
+------+-------+-----+-----+--------+
| cno  | cname | tno | tno | tname  |
+------+-------+-----+-----+--------+
| 1003 | mysql | 103 | 103 | oldguo |
+------+-------+-----+-----+--------+
```
---
#2.统计一下每门课程的总成绩
```bash
SELECT * FROM school.course;
SELECT * FROM school.te;

关联表：school.course school.sc
关联列：school.course.cno school.sc.cno
关联后临时表：
+------+--------+-----+-----+------+-------+
| cno  | cname  | tno | sno | cno  | score |
+------+--------+-----+-----+------+-------+
| 1001 | linux  | 101 |   1 | 1001 |    80 |
| 1002 | python | 102 |   1 | 1002 |    59 |
| 1002 | python | 102 |   2 | 1002 |    90 |
| 1003 | mysql  | 103 |   2 | 1003 |   100 |
| 1001 | linux  | 101 |   3 | 1001 |    99 |
| 1003 | mysql  | 103 |   3 | 1003 |    40 |
| 1001 | linux  | 101 |   4 | 1001 |    79 |
| 1002 | python | 102 |   4 | 1002 |    61 |
| 1003 | mysql  | 103 |   4 | 1003 |    99 |
| 1003 | mysql  | 103 |   5 | 1003 |    40 |
| 1001 | linux  | 101 |   6 | 1001 |    89 |
| 1003 | mysql  | 103 |   6 | 1003 |    77 |
| 1001 | linux  | 101 |   7 | 1001 |    67 |
| 1003 | mysql  | 103 |   7 | 1003 |    82 |
| 1001 | linux  | 101 |   8 | 1001 |    70 |
| 1003 | mysql  | 103 |   9 | 1003 |    80 |
| 1003 | mysql  | 103 |  10 | 1003 |    96 |
+------+--------+-----+-----+------+-------+


SELECT course.cname,SUM(sc.score) 
FROM school.course
JOIN school.sc
ON course.cno=sc.cno
GROUP BY course.cname,course.cno;  //以两个条件构成分组条件，防止单科多老师出现。
结果：
+--------+---------------+
| cname  | SUM(sc.score) |
+--------+---------------+
| linux  |           484 |
| mysql  |           614 |
| python |           210 |
+--------+---------------+
```
---
#3.统计一下每门课程的总成绩和课程代码
```bash
SELECT course.cno,course.cname,SUM(sc.score) 
FROM school.course
JOIN school.sc
ON course.cno=sc.cno
GROUP BY course.cname; 
结果：
ERROR:sql_mode=only_full_group_by
#5.7版本会报错的情况，在sqlyog中一下操作没问题，但命令行会报错。
原因：
	1.在select后面的列，不是分组的条件，并且没有在函数（sum中）中包裹。
	2.如果GROUP BY 后是主键列或唯一列。如下 

SELECT course.cno,course.cname,SUM(school.sc.score) 
FROM school.course
JOIN school.sc
ON course.cno=sc.cno
GROUP BY school.course.cno; #此处为主键或唯一列可避免该错误。
结果：
+------+--------+----------------------+
| cno  | cname  | SUM(school.sc.score) |
+------+--------+----------------------+
| 1001 | linux  |                  484 |
| 1002 | python |                  210 |
| 1003 | mysql  |                  614 |
+------+--------+----------------------+
```
#4. 查询oldguo老师教的学生姓名列表
```bash
关联后的临时表：
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+
| tno | tname  | cno  | cname  | tno | sno | cno  | score | sno | sname   | sage | ssex |
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+
| 101 | oldboy | 1001 | linux  | 101 |   1 | 1001 |    80 |   1 | zhang3  |   18 | m    |
| 102 | hesw   | 1002 | python | 102 |   1 | 1002 |    59 |   1 | zhang3  |   18 | m    |
| 102 | hesw   | 1002 | python | 102 |   2 | 1002 |    90 |   2 | zhang4  |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   2 | 1003 |   100 |   2 | zhang4  |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   3 | 1001 |    99 |   3 | li4     |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   3 | 1003 |    40 |   3 | li4     |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   4 | 1001 |    79 |   4 | wang5   |   19 | f    |
| 102 | hesw   | 1002 | python | 102 |   4 | 1002 |    61 |   4 | wang5   |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   4 | 1003 |    99 |   4 | wang5   |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   5 | 1003 |    40 |   5 | zh4     |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   6 | 1001 |    89 |   6 | zhao4   |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   6 | 1003 |    77 |   6 | zhao4   |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   7 | 1001 |    67 |   7 | ma6     |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   7 | 1003 |    82 |   7 | ma6     |   19 | f    |
| 101 | oldboy | 1001 | linux  | 101 |   8 | 1001 |    70 |   8 | oldboy  |   20 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   9 | 1003 |    80 |   9 | oldgirl |   20 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |  10 | 1003 |    96 |  10 | oldp    |   25 | m    |
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+

SELECT teacher.tname,group_CONCAT(school.student.sname)
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
WHERE teacher.tname='oldguo';  //查询一个老师用where 
结果：
+--------+---------------------------------------------+
| tname  | group_CONCAT(school.student.sname)          |
+--------+---------------------------------------------+
| oldguo | zhang4,li4,wang5,zh4,zhao4,ma6,oldgirl,oldp |
+--------+---------------------------------------------+
```
---
#5. 查询所有老师教的学生姓名列表
```bash
关联后的临时表：
见4

SELECT teacher.tname,group_CONCAT(school.student.sname)
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
GROUP BY teacher.tno   //查询所有老师需要用group by进行站队
结果：
+--------+---------------------------------------------+
| tname  | group_CONCAT(school.student.sname)          |
+--------+---------------------------------------------+
| oldboy | zhang3,li4,wang5,zhao4,ma6,oldboy           |
| hesw   | zhang3,wang5,zhang4                         |
| oldguo | zhang4,li4,zh4,zhao4,ma6,oldgirl,wang5,oldp |
+--------+---------------------------------------------+
```
---
#6. 查询oldboy老师教的成绩大于70的学生姓名，和成绩
```bash
关联后的临时表：
见4

SELECT student.sname,sc.score
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
WHERE teacher.tname='oldboy' AND sc.score>70;
结果：
+--------+-------+
| sname  | score |
+--------+-------+
| zhang3 |    80 |
| li4    |    99 |
| wang5  |    79 |
| zhao4  |    89 |
+--------+-------+
```
---
#7. 统计zhang3,学习了几门课
```bash
关联后的临时表：
+-----+---------+------+------+-----+------+-------+------+--------+-----+
| sno | sname   | sage | ssex | sno | cno  | score | cno  | cname  | tno |
+-----+---------+------+------+-----+------+-------+------+--------+-----+
|   1 | zhang3  |   18 | m    |   1 | 1001 |    80 | 1001 | linux  | 101 |
|   1 | zhang3  |   18 | m    |   1 | 1002 |    59 | 1002 | python | 102 |
|   2 | zhang4  |   18 | m    |   2 | 1002 |    90 | 1002 | python | 102 |
|   2 | zhang4  |   18 | m    |   2 | 1003 |   100 | 1003 | mysql  | 103 |
|   3 | li4     |   18 | m    |   3 | 1001 |    99 | 1001 | linux  | 101 |
|   3 | li4     |   18 | m    |   3 | 1003 |    40 | 1003 | mysql  | 103 |
|   4 | wang5   |   19 | f    |   4 | 1001 |    79 | 1001 | linux  | 101 |
|   4 | wang5   |   19 | f    |   4 | 1002 |    61 | 1002 | python | 102 |
|   4 | wang5   |   19 | f    |   4 | 1003 |    99 | 1003 | mysql  | 103 |
|   5 | zh4     |   18 | m    |   5 | 1003 |    40 | 1003 | mysql  | 103 |
|   6 | zhao4   |   18 | m    |   6 | 1001 |    89 | 1001 | linux  | 101 |
|   6 | zhao4   |   18 | m    |   6 | 1003 |    77 | 1003 | mysql  | 103 |
|   7 | ma6     |   19 | f    |   7 | 1001 |    67 | 1001 | linux  | 101 |
|   7 | ma6     |   19 | f    |   7 | 1003 |    82 | 1003 | mysql  | 103 |
|   8 | oldboy  |   20 | m    |   8 | 1001 |    70 | 1001 | linux  | 101 |
|   9 | oldgirl |   20 | f    |   9 | 1003 |    80 | 1003 | mysql  | 103 |
|  10 | oldp    |   25 | m    |  10 | 1003 |    96 | 1003 | mysql  | 103 |
+-----+---------+------+------+-----+------+-------+------+--------+-----+

SELECT student.sname,GROUP_CONCAT(school.course.cname)
FROM school.student 
JOIN school.sc
ON student.sno = sc.sno
JOIN school.course
ON sc.cno =course.cno
WHERE student.sname='zhang3'; //由于是查单个学生，所以不需要GROUP BY进行分组
#GROUP BY student.sno;
结果：
+--------+-----------------------------------+
| sname  | GROUP_CONCAT(school.course.cname) |
+--------+-----------------------------------+
| zhang3 | linux,python                      |
+--------+-----------------------------------+

SELECT GROUP_CONCAT(school.course.cname)
FROM school.student 
JOIN school.sc
ON student.sno = sc.sno
JOIN school.course
ON sc.cno = course.cno
WHERE school.student.sname='zhang3'
GROUP BY school.student.sno;
结果：
+-----------------------------------+
| GROUP_CONCAT(school.course.cname) |
+-----------------------------------+
| python,linux                      |
+-----------------------------------+
```
---
#8. 查询oldguo老师教的学生名.
```bash
关联后的临时表：
见7

SELECT teacher.tname,GROUP_CONCAT(student.sname)
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
WHERE teacher.tname='oldguo' ////由于是查单个老师，所以不需要GROUP BY进行分组
#GROUP BY teacher.tname;
结果：
+--------+---------------------------------------------+
| tname  | GROUP_CONCAT(student.sname)                 |
+--------+---------------------------------------------+
| oldguo | zhang4,li4,wang5,zh4,zhao4,ma6,oldgirl,oldp |
+--------+---------------------------------------------+
```
---
#9. 查询oldguo所教课程的平均分数
```bash
关联后的临时表：
+-----+--------+------+--------+-----+-----+------+-------+
| tno | tname  | cno  | cname  | tno | sno | cno  | score |
+-----+--------+------+--------+-----+-----+------+-------+
| 101 | oldboy | 1001 | linux  | 101 |   1 | 1001 |    80 |
| 102 | hesw   | 1002 | python | 102 |   1 | 1002 |    59 |
| 102 | hesw   | 1002 | python | 102 |   2 | 1002 |    90 |
| 103 | oldguo | 1003 | mysql  | 103 |   2 | 1003 |   100 |
| 101 | oldboy | 1001 | linux  | 101 |   3 | 1001 |    99 |
| 103 | oldguo | 1003 | mysql  | 103 |   3 | 1003 |    40 |
| 101 | oldboy | 1001 | linux  | 101 |   4 | 1001 |    79 |
| 102 | hesw   | 1002 | python | 102 |   4 | 1002 |    61 |
| 103 | oldguo | 1003 | mysql  | 103 |   4 | 1003 |    99 |
| 103 | oldguo | 1003 | mysql  | 103 |   5 | 1003 |    40 |
| 101 | oldboy | 1001 | linux  | 101 |   6 | 1001 |    89 |
| 103 | oldguo | 1003 | mysql  | 103 |   6 | 1003 |    77 |
| 101 | oldboy | 1001 | linux  | 101 |   7 | 1001 |    67 |
| 103 | oldguo | 1003 | mysql  | 103 |   7 | 1003 |    82 |
| 101 | oldboy | 1001 | linux  | 101 |   8 | 1001 |    70 |
| 103 | oldguo | 1003 | mysql  | 103 |   9 | 1003 |    80 |
| 103 | oldguo | 1003 | mysql  | 103 |  10 | 1003 |    96 |
+-----+--------+------+--------+-----+-----+------+-------+

SELECT teacher.tname,AVG(sc.score)
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
WHERE school.teacher.tname='oldguo'  //查询单个老师所教课程的平均成绩，不需要加GROUP BY 
#GROUP BY school.teacher.tno;
结果：
+--------+---------------+
| tname  | AVG(sc.score) |
+--------+---------------+
| oldguo |       76.7500 |
+--------+---------------+
```
---
#10. 每位老师所教课程的平均分,并按平均分排序
```bash
关联后的临时表：
见9

SELECT teacher.tname,AVG(sc.score)
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
GROUP BY teacher.tno
ORDER BY AVG(sc.score) DESC; //ORDER BY ... desc降序排序
结果：
+--------+---------------+
| tname  | AVG(sc.score) |
+--------+---------------+
| oldboy |       80.6667 |
| oldguo |       76.7500 |
| hesw   |       70.0000 |
+--------+---------------+
```
---
#11. 查询oldguo所教的不及格的学生姓名
```
关联后的临时表：
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+
| tno | tname  | cno  | cname  | tno | sno | cno  | score | sno | sname   | sage | ssex |
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+
| 101 | oldboy | 1001 | linux  | 101 |   1 | 1001 |    80 |   1 | zhang3  |   18 | m    |
| 102 | hesw   | 1002 | python | 102 |   1 | 1002 |    59 |   1 | zhang3  |   18 | m    |
| 102 | hesw   | 1002 | python | 102 |   2 | 1002 |    90 |   2 | zhang4  |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   2 | 1003 |   100 |   2 | zhang4  |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   3 | 1001 |    99 |   3 | li4     |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   3 | 1003 |    40 |   3 | li4     |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   4 | 1001 |    79 |   4 | wang5   |   19 | f    |
| 102 | hesw   | 1002 | python | 102 |   4 | 1002 |    61 |   4 | wang5   |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   4 | 1003 |    99 |   4 | wang5   |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   5 | 1003 |    40 |   5 | zh4     |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   6 | 1001 |    89 |   6 | zhao4   |   18 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   6 | 1003 |    77 |   6 | zhao4   |   18 | m    |
| 101 | oldboy | 1001 | linux  | 101 |   7 | 1001 |    67 |   7 | ma6     |   19 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |   7 | 1003 |    82 |   7 | ma6     |   19 | f    |
| 101 | oldboy | 1001 | linux  | 101 |   8 | 1001 |    70 |   8 | oldboy  |   20 | m    |
| 103 | oldguo | 1003 | mysql  | 103 |   9 | 1003 |    80 |   9 | oldgirl |   20 | f    |
| 103 | oldguo | 1003 | mysql  | 103 |  10 | 1003 |    96 |  10 | oldp    |   25 | m    |
+-----+--------+------+--------+-----+-----+------+-------+-----+---------+------+------+

SELECT student.sname,sc.score
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
WHERE teacher.tname='oldguo' AND sc.score<60;
结果：
+-------+-------+
| sname | score |
+-------+-------+
| li4   |    40 |
| zh4   |    40 |
+-------+-------+
```

#12. 查询所有老师所教学生不及格的信息
```bash
关联后的临时表：
见11

SELECT teacher.tname,student.sname,sc.score
FROM school.teacher
JOIN school.course
ON teacher.tno = course.tno
JOIN school.sc
ON course.cno = sc.cno
JOIN school.student
ON sc.sno = student.sno
WHERE school.sc.score<60;
结果：
+--------+--------+-------+
| tname  | sname  | score |
+--------+--------+-------+
| hesw   | zhang3 |    59 |
| oldguo | li4    |    40 |
| oldguo | zh4    |    40 |
+--------+--------+-------+
```
---
#### 左连接（左外连接）
##### 关键字：left join on / left outer join on
##### 方式：
**取左表所有的值，和右表里面关联的值(右表不存在的值以null填充)。形成新表。**
**内连接：只取满足where条件的值。**
![内连接](/images/img-33.png)

**左外连接（and换成where条件）：用于指定city为驱动表(结果集较少的表)，用于减少循环判断的次数。**

![左外连接](/images/img-34.png)

##### 说明：
**left join 是left outer join的简写，它的全称是左外连接，是外连接中的一种。**
左(外)连接，左表(a_table)的记录将会全部表示出来，而右表(b_table)只会显示符合搜索条件的记录。右表记录不足的地方均为NULL。
![左外连接](/images/img-35.png)

#### 右连接（右外连接）
##### 关键字：right join on / right outer join on
##### 语句：
```bash
select * 
from a_table a 
right outer join b_table b 
on a.a_id = b.b_id;
```
##### 说明：
**right join是right outer join的简写，它的全称是右外连接，是外连接中的一种。**
与左(外)连接相反，右(外)连接，左表(a_table)只会显示符合搜索条件的记录，而右表(b_table)的记录将会全部表示出来。左表记录不足的地方均为NULL。
![右外连接](/images/img-37.png)
