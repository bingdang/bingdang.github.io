---
title: Golang-接口
author: 饼铛
tags:
  - Golang
categories:
  - Golang
cover: /images/pasted-2.png
abbrlink: f9d199b7
date: 2021-02-15 22:02:00
---
# 1. 接口

接口（interface）定义了一个对象的行为规范，只定义规范不实现，由具体的对象来实现规范的细节。

## 1.1 接口类型

在Go语言中接口（interface）是一种类型，一种抽象的类型。

`interface`是一组`method(方法)`的集合，是`duck-type programming`的一种体现。接口做的事情就像是定义一个协议（规则），只要一台机器有洗衣服和甩干的功能，我就称它为洗衣机。不关心属性（数据），只关心行为（方法）。

为了保护你的Go语言职业生涯，请牢记接口（interface）是一种类型。

**为什么要使用接口？**

```go
type Cat struct{}

type Dog struct{}

type Pig struct{}

func (c Cat) Say() string { return "喵喵喵" }

func (d Dog) Say() string { return "汪汪汪" }

func (c Pig) Say() string {
	return "哼哼哼"
 }

type animal interface {
 //定义接口
	Say() string
}

//为什么要用接口
func main(){
	//面向对象
	c:= Cat{}
	fmt.Println("猫:",c.Say())
	d :=Dog{}
	fmt.Println("狗:",d.Say())
	p :=Pig{}
	fmt.Println("猪:",p.Say())

	//面向接口
	animalList := make([]animal,0,100)
 //定义并初始化类型为动物的切片
	animalList = append(animalList,c,d,p)
  //将生成的动物存入该切片
	for _,a := range animalList {
 //遍历同一特效的动物
		call := a.Say()
 //通过接口调用方法
		fmt.Println(call)
	}
}
```

上面的代码中定义了猫和狗，然后它们都会叫，你会发现main函数中明显有重复的代码，如果我们后续再加上猪、青蛙等动物的话，我们的代码还会一直重复下去。那我们能不能把它们当成“能叫的动物”来处理呢？

**像类似的例子在我们编程过程中会经常遇到：**

- 比如一个网上商城可能使用支付宝、微信、银联等方式去在线支付，我们能不能把它们当成“支付方式”来处理呢？

- 比如三角形，四边形，圆形都能计算周长和面积，我们能不能把它们当成“图形”来处理呢？

- 比如销售、行政、程序员都能计算月薪，我们能不能把他们当成“员工”来处理呢？

Go语言中为了解决类似上面的问题，就设计了接口这个概念。接口区别于我们之前所有的具体类型，接口是一种抽象的类型。当你看到一个接口类型的值时，你不知道它是什么，唯一知道的是通过它的方法能做什么。

## 1.2 接口的定义

Go语言提倡面向接口编程。

每个接口由数个方法组成，接口的定义格式如下：

```go
type 接口类型名 interface{
    方法名1( 参数列表1 ) 返回值列表1
    方法名2( 参数列表2 ) 返回值列表2
    …
}
//参数列表中，可以只写参数数据类型
```

其中：

- 接口名：使用`type`将接口定义为自定义的类型名。Go语言的接口在命名时，一般会在单词后面添加`er`，如有写操作的接口叫`Writer`，有字符串功能的接口叫`Stringer`等。接口名最好要能突出该接口的类型含义。

- 方法名：当方法名首字母是大写且这个接口类型名首字母也是大写时，这个方法可以被接口所在的包（package）之外的代码访问。

- 参数列表、返回值列表：参数列表和返回值列表中的参数变量名可以省略。

举个例子：

```go
type writer interface{
    Write([]byte) error
}
```

当你看到这个接口类型的值时，你不知道它是什么，唯一知道的就是可以通过它的Write方法来做一些事情。

## 1.3 实现接口的条件

一个对象只要全部实现了接口中的方法，那么就实现了这个接口。换句话说，接口就是一个**需要实现的方法列表**。

我们来定义一个`Sayer`接口：

```go
// Sayer 接口
type Sayer interface {
	say()
}

```

定义`dog`和`cat`两个结构体：

```go
type dog struct {}

type cat struct {}

```

因为`Sayer`接口里只有一个`say`方法，所以我们只需要给`dog`和`cat `分别实现`say`方法就可以实现`Sayer`接口了。

```go
// dog实现了Sayer接口
func (d dog) say() {
	fmt.Println("汪汪汪")
}

// cat实现了Sayer接口
func (c cat) say() {
	fmt.Println("喵喵喵")
}
```

接口的实现就是这么简单，只要实现了接口中的所有方法，就实现了这个接口。

## 1.4 接口类型变量

那实现了接口有什么用呢？

接口类型变量能够存储所有实现了该接口的实例。 例如上面的示例中，`Sayer`类型的变量能够存储`dog`和`cat`类型的变量。

```go
func main() {
	var x Sayer // 声明一个Sayer类型的变量x
	a := cat{}  // 实例化一个cat
	b := dog{}  // 实例化一个dog
	x = a       // 可以把cat实例直接赋值给x
	x.say()     // 喵喵喵
	x = b       // 可以把dog实例直接赋值给x 32
	x.say()     // 汪汪汪
}
```

**Tips：** 观察下面的代码，体味此处`_`的妙用

```go
// 摘自gin框架routergroup.go
type IRouter interface{ ... }

type RouterGroup struct { ... }

var _ IRouter = &RouterGroup{}  // 确保RouterGroup实现了接口IRouter
```

