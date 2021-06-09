---
title: SQL初识
author: 饼铛
tags:
  - MySQL
  - SQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: b571ca78
date: 2019-04-12 22:04:00
---
### 1.SQL介绍
**结构化查询语言。5.7 版本加入了SQL Mode 严格模式**

### 2.SQL作用
**SQL 用来管理和操作MySQL内部的对象**
**SQL对象：**
- 库：库名，库属性
- 表：表名，表属性，列名，记录，数据类型，列属性和约束

### 3.SQL语句的类型
- **DDL：数据定义语言    data definition language**
- **DCL：数据控制语言    data control language**
- **DML：数据操作语言    data manipulation language**
- **DQL：数据查询语言    data query language**

### 4.数据类型
![data type](/images/img-17.png)
#### 4.1 作用：
- **控制数据的规范性，让数据有具体含义，在列上进行控制**

#### 4.2.种类
##### 1.字符串
- char(32):
  - 定长长度为32的字符串。
  - 存储数据时，一次性提供32字符长度的存储空间，存不满，用空格填充。
- varchar(32):
  - 可变长度的字符串类型。
  - 存数据时，首先进行字符串长度判断，按需分配存储空间
  - **会单独占用一个字节来记录此次的字符长度**。超过255之后，需要**两个字节长度**记录字符长度。

##### 面试题：
- char 和varchar的区别？
  -   255   65535
  - 定长（固定存储空间）   变长（按需）
- char和varchar 如何选择？
  - char类型，固定长度的字符串列，比如手机号，身份证号，银行卡号，性别等 
  - varchar类型，不确定长度的字符串，可以使用。
悬念：
为什么呢？影响到索引的高度？

##### 2.enum 枚举类型
- `enum('bj','sh','sz','cq','hb',......)`
 - 数据行较多时，会影响到索引的应用
 - **注意：**数字类禁止使用enum类型

##### 3.数字
- tinyint 
- int

##### 4.时间
- timestamp
- datetime

更多：[https://www.jianshu.com/p/08c4b78402ff](https://www.jianshu.com/p/08c4b78402ff)

### 表属性列属性
#### 1.表属性 
 - 存储引擎 ：engine =  InnoDB
 - 字符集   ：charset = utf8mb4
 - 排序规则（校对规则） ：collation 
   - 针对英文字符串大小写问题，用于规定大小写是否敏感。


#### 字符集如何选择：
 - utf8    中文  三个字节长度
 - utf8mb4 中文  四个字节长度
   - 才是真正的utf8，且支持emoji字符

#### 2. 列的属性和约束
##### 1.主键： primary key (PK)
- **特点：唯一，非空.**
- **什么样的列适合当主键：**
	数字列，整数列，无关列，自增的
- **聚集索引列：**
 - **定义：**是一种约束，也是一种索引类型，在一张表中只能有一个主键。

##### 2.非空： Not NULL 
**说明：**我们建议，对于普通列来讲，尽量设置not null，一般配合默认值使用。
##### 3.默认值：default
**说明：**数字列的默认值使用0 ,字符串类型，设置为一个nil或null

##### 4.自增 auto_increment
**说明：**针对数字列，自动生成顺序值

##### 5.无符号 unsigned
**说明：**针对数字列  <==不让有负数符号，必须是正数。

### 库表操作语句
#### 库  
##### （1）建库 DDL语句
```bash
mysql> create database oldguo charset utf8mb4;
mysql> show databases;
mysql> show create database oldguo;
```
##### （2）改库 DDL语句
```bash
mysql> alter database oldguo1 charset utf8mb4;
```
##### （3）删库（不代表生产操作！）
```bash
mysql> drop database oldguo1;
```
#### 表
##### （0）建表建库规范：
- 1、库名和表名是小写字母
 - 为啥？开发和生产平台可能会出现问题（操作系统对大小写敏感不同）。
- 2、不能以数字开头
- 3、不支持-  支持_
- 4、内部函数名不能使用
- 5、名字和业务功能有关（his,jf,yz,oss,erp,crm...）

##### （1）建表
```bash
create table oldfly (
id int not null primary key auto_increment comment '学号',
name varchar(255) not null comment '学生姓名',
age tinyint unsigned not null default 0 comment '学生年龄',
gender enum('m','f','n') not null default 'n' comment '性别'
)charset=utf8mb4 engine=innodb;
```
```bash
CREATE TABLE oldfei (
id int NOT NULL PRIMARY KEY auto_increment COMMENT '序列',
name VARCHAR(255) NOT NULL COMMENT '姓名',
qq VARCHAR(20) NOT NULL UNIQUE COMMENT 'QQ',
stime datetime NOT NULL DEFAULT NOW()
)CHARSET=utf8mb4 ENGINE=INNODB
```
##### （2）改表
**添加列：**
```bash
ALTER TABLE oldfly ADD telnum CHAR(11) NOT NULL UNIQUE COMMENT '手机号';
-- 练习：
-- 在上表中加一个状态列state，非空，默认值为1.
ALTER TABLE oldfly ADD state ENUM('1','0') DEFAULT 1 NOT NULL COMMENT '状态';
-- online-DDL : pt-osc (自己研究下***，不锁表修改)
```
##### 查看列(查看表属性)：DESC
`DESC oldfly;`

##### 删除列（生产不能轻易用）：DROP
`ALTER TABLE oldfly DROP state;`

##### 在指定name列后插入qq列： AFTER
`ALTER TABLE oldfly ADD qq VARCHAR(255) NOT NULL UNIQUE COMMENT 'QQ号' AFTER name;`

##### 首列添加sid列：FIRST
`ALTER TABLE oldfly ADD sid VARCHAR(255) NOT NULL UNIQUE COMMENT '学号' FIRST;`

##### 修改列属性（覆盖原来）：MODIFY
`ALTER TABLE oldfly MODIFY name VARCHAR(128) NOT NULL;`

##### 修改列属性（覆盖原来）同时可修改列名：CHANGE
`ALTER TABLE oldfly CHANGE gender gd CHAR(1) NOT NULL DEFAULT 'n' COMMENT '性别';`

##### 查看详细表结构(show 建表语句)：
`SHOW CREATE TABLE oldfly;`

##### 创建一个相同表结构的空表：
`CREATE TABLE feichi LIKE oldfly;`

##### 删除列：
`ALTER TABLE oldfly DROP telnum;`

![DDL](/images/img-30.png)

---
##### 插入数据：
```bash
---INSERT 
---最简单的方法插入记录：
DESC oldfly;
INSERT INTO oldfly VALUES(1,'飞驰','513247869','20');
---最规范的方法插入记录：
INSERT INTO oldfly(name,qq,age) VALUES('佳乐','2292937329','80');
```
##### 批量插入：
```bash
INSERT INTO oldfei(name,qq) VALUES
('feichi','51324782'),
('黎*宁','985728731'),
('鱼疯','385728731'),
('小黑','285728731'),
('猴子','185728731'),
('老蔡','585728731')
;
```
##### 查看所有数据DQL：
`SELECT * FORM oldfly;`

##### 更新指定记录：
`UPDATE oldfly SET qq='10001' WHERE id=1;`

##### DELETE (注意谨慎操作！！！！)：
`DELETE FROM oldfly WHERE id=4; `

##### 生产需求：将一个大表全部数据清空
DELETE FROM oldguo;
TRUNCATE TABLE oldguo;
##### DELETE 和 TRUNCATE 区别
1. DELETE 逻辑逐行删除，不会降低自增长的起始值。效率很低，碎片较多，会影响到性能。
2. TRUNCATE ，属于物理删除，将表段中的区进行清空，不会产生碎片。性能较高。

##### 生产需求：使用update替代delete，进行伪删除
1. 添加状态列state (0代表存在，1代表删除)
`ALTER TABLE oldguo ADD state TINYINT NOT NULL DEFAULT 0 ;`
2. 使用update模拟delete 
```bash
DELETE FROM oldguo WHERE id=6;
替换为
UPDATE oldguo SET state=1 WHERE id=6;
SELECT * FROM oldguo ;
```
3. 业务语句修改
`SELECT * FROM oldguo ;`
改为 
`SELECT * FROM oldguo WHERE state=0;`


![DML](/images/img-29.png)
