---
title: Golang-指针、类型自定义、类型别名、结构体、json序列化、面向对象、包
author: 饼铛
tags:
  - Golang
categories:
  - Golang
cover: /images/pasted-2.png
abbrlink: b17eefd4
date: 2021-02-15 21:32:00
---
# 1. 指针

指针地址、指针类型、指针取值

**指针概念：**任何程序数据载入内存后，在内存都有他们的地址，这就是指针。而为了保存一个数据在内存中的地址，我们就需要指针变量。

指针和地址的区别：

- 地址：就是内存地址(用字节来描述的内存地址)

- 指针：指针是带类型的

Go语言中的指针不能进行偏移和运算，因此Go语言中的指针操作非常简单，我们只需要记住两个符号：`&`（取地址）和`*`（根据地址取值）。

Go语言中使用`&`字符放在变量前面对变量进行“取地址”操作。 Go语言中的值类型（int、float、bool、string、array、struct）都有对应的指针类型，如：`*int`、`*int64`、`*string`等。

## 1.1 指针取值

```go
func main() {
	var a int = 2
	b := &a //取变量a的内存地址
	fmt.Printf("%T,%v\n",b,b)
//*int,0xc00000a0b0
	fmt.Println(*b)
 //根据内存地址取值 //2
}
```

**总结：** 取地址操作符`&`和取值操作符`*`是一对互补操作符，`&`取出地址，`*`根据地址取出地址指向的值。

## 1.2 指针传递

```go
func modify(A1 [4]int){
	A1[0] = 100
}

func main() {
	Array := [4]int{1,2,3,4} //定义一个数组，数组为值类型
	fmt.Println(Array) //[1 2 3 4]
	modify(Array)
	fmt.Println(Array) //[1 2 3 4]
}

func modify(A1 *[4]int){ //对指针变量进行取值（*）操作，可以获得指针变量指向的原变量的值。
	A1[0] = 100
 //语法糖简易写法
    //(*a1)[0] = 100 //正规写法
}

func main() {
	Array := [4]int{1,2,3,4} //定义一个数组，数组为值类型
	fmt.Println(Array) //[1 2 3 4]
	modify(&Array) //对变量进行取地址（&）操作，可以获得这个变量的指针变量。
	fmt.Println(Array) //[100 2 3 4]
}
```

## 1.3 new()和make()

`new()`是用来初始化**值类型**指针，来得到一个指定类型的指针

它的函数签名如下：

```go
func new(Type) *Type
```

其中，

- Type表示类型，new函数只接受一个参数，这个参数是一个类型

- *Type表示类型指针，new函数返回一个指向该类型内存地址的指针。



`make()`是用来初始化**引用类型**指针的，如slice、map、chan

```go
var (
	//a *int //a是一个int类型的指针，错误写法
	a = new(int) //得到一个int类型的指针
	b = new([3]int) //得到一个切片类型的指针
)

func main(){
	fmt.Printf("%T,%v,%v \n",a,a,*a) //*int,0xc00000a0b0,0
	*a = 10 //对指针中内存地址中的值进行修改
	fmt.Printf("%T,%v,%v \n",a,a,*a) //*int,0xc00000a0b0,10

	fmt.Println(*b) //[0 0 0]
	(*b)[0] = 100 //对指针中内存地址中的值进行修改
	fmt.Println(*b) //[100 0 0]
}
```

# 2. panic和recover

程序运行期间`f1`中引发了`panic`导致程序崩溃，异常退出了。这个时候我们就可以通过`recover`将程序恢复回来，继续往后执行。

```go
func f1(){
	defer func() {
		err := recover()
		fmt.Println("捕获错误",err)
	}()
	var a []int
	a[0] = 100
	fmt.Println(a)
}

func main(){
	f1()
	fmt.Println("这是main函数")
}

//捕获错误 runtime error: index out of range [0] with length 0
//这是main函数
```

# 3. 自定义类型和类型别名

**自定义类型：**

 Go语言中可以使用`type`关键字来定义自定义类型。通过`type`关键字的定义，`MyInt`就是一种新的类型，它具有`int`的特性。

```go
//将MyInt定义为int类型
type MyInt int
```



**类型别名：**

内置：byte[字节] 实际是`uint8`，rune 实际是`int32`，分别代表ASCII码和UTF8编码，用于处理英文和其他语言。

TypeAlias只是Type的别名，本质上TypeAlias与Type是同一个类型。只存在代码编写过程中，增加代码可读性。

```go
//定义TypeAlias为Type类型的别名
type TypeAlias = Type
```

# 4. 结构体

Go语言中的基础数据类型可以表示一些事物的基本属性，但是当我们想表达一个事物的全部或部分属性时，这时候再用单一的基本数据类型明显就无法满足需求了，Go语言提供了一种自定义数据类型，可以封装多个基本数据类型，这种数据类型叫结构体，英文名称`struct`。 也就是我们可以通过`struct`来定义自己的类型了。

Go语言中通过`struct`来实现面向对象。

```go
//创建新的类型要使用type关键字
type Employee struct {
 //定义一个结构体
	name string
	age int
	gender bool
	hobby []string
}

func main() {
	var felix = Employee{
 //声明一个结构体的变量，并赋值
		name : "felix",
		age : 19,
		gender: true,
		hobby: []string{"游戏","pipix"},
	}
	fmt.Println(felix) //{felix 19 true [游戏 pipix]}
	fmt.Println(felix.name) //felix
	fmt.Println(felix.gender) //true
	felix.gender=false
	fmt.Println(felix.gender) //felix
}
```

## 4.1 结构体的实例化

只有当结构体实例化时，才会真正地分配内存。也就是必须实例化后才能使用结构体的字段。

结构体本身也是一种类型，我们可以像声明内置类型一样使用`var`关键字声明结构体类型。

```go
var 结构体实例 结构体类型
```

### 4.1.1 基本实例化

```go
type pop struct{
	name string
	age int
	id string
}

func main() {
//以下方法的到的是结构体
	//基本实例化
	var p1 pop
	p1.name = "mafei"
	p1.age = 30
	p1.id = "10211"
	fmt.Println(p1) //{mafei 30 10211}
	//我们通过.来访问结构体的字段（成员变量）,例如p1.name和p1.age等。

	//实例化方法2（声明后直接赋值,即实例化又初始化）
	var p2 = pop{
		name : "feifeima",
		age : 17,
		id : "10212",
	}
	fmt.Println(p2) //{feifeima 17 10212}

	//实例化方法2.1（简单写法）
	var p3 = pop{
		"feifeima2",
		18,
		"10213",
	}
	fmt.Println(p3) //{feifeima2 18 10213}

	//实例化方法3（只进行实例化，不赋值）
	var p4 = pop{}
	fmt.Println(p4) //{ 0 }
	//如果初始化是没有给属性设置对应的初始值，那个对应属性就是其数据类型的默认值

```

### 4.1.2 匿名结构体

在定义一些临时数据结构等场景下还可以使用匿名结构体。

```go
package main
     
import (
    "fmt"
)
     
func main() {
    var user struct{Name string; Age int}
    user.Name = "小王子"
    user.Age = 18
    fmt.Printf("%#v\n", user)
}
```

### 4.1.3 指针类型结构体（）

通过使用`new`关键字对结构体进行实例化，得到的是结构体的地址。 格式如下：

```go
//以下方法的到的是结构体的指针，因为结构体是值类型，得到指针后就可以修改对应的值
	//实例化方法4（利用结构体指针实例化）
	//由于struct是值类型的，可以通过new(T)，T代表类型。初始化struct的指针
	var p5 = new(pop)
	fmt.Printf("%T\n",p5) //*main.pop
	//(*p5).name,直接修改内存地址中的值
	p5.name = "feip5"
	p5.age = 10
	fmt.Println(p5.name,p5.age) //feip5 10

	//实例化方法4.1（同上）
	var p6 = &pop{}
	fmt.Printf("%T\n",p6) //*main.pop
```

方法4.1.3中 使用`&`对结构体进行取地址操作相当于对该结构体类型进行了一次`new`实例化操作。修改值而不是修改副本

`p5.name = "feip5"`其实在底层是`(*p5).name = "feip5"`，这是Go语言实现的语法糖。结构体指针直接使用`.`来访问结构体的成员。

4.1.3 使用`&`对结构体进行取地址操作相当于对该结构体类型进行了一次`new`实例化操作。

## 4.2 结构体的初始化

没有初始化的结构体，其成员变量都是对应其类型的零值。

### 4.2.1 使用键值对初始化

```go
type trainee struct {
	name string
	id int
}

func main(){
	T1 := trainee{
		name:"felix",
		id:001,
	}
	fmt.Println(T1) //{felix 1}
}
```

### 4.2.2 结构体指针键值对初始化

```go
func main(){
    T2 := &trainee{
		name:"felix2",
		id:002,
	}
	fmt.Println(T2) //&{felix2 2}
}
```

当某些字段没有初始值的时候，该字段可以不写。此时，没有指定初始值的字段的值就是该字段类型的零值。

```go
func main(){
	fmt.Println(T2) //&{felix2 2}

	T3 := &trainee{
		name:"felix2",
	}
	fmt.Println(T3) //&{felix2 0}
}
```

### 4.2.3 使用值的列表初始化

```go
func main(){
	var p3 = pop{
		"feifeima2",
		003,
	}
	fmt.Println(p3) //{feifeima2 003}
}
```

使用这种格式初始化时，需要**注意**：

1. 必须初始化结构体的所有字段。

1. 初始值的填充顺序必须与字段在结构体中的声明顺序一致。

1. 该方式不能和键值初始化方式混用。

## 4.3 结构体的内存布局

结构体占用一块连续的内存。

```go
type test struct {
	a int8
	b int8
	c int8
	d int8
}
n := test{
	1, 2, 3, 4,
}
fmt.Printf("n.a %p\n", &n.a)
fmt.Printf("n.b %p\n", &n.b)
fmt.Printf("n.c %p\n", &n.c)
fmt.Printf("n.d %p\n", &n.d)
```

输出：

```go
n.a 0xc0000a0060
n.b 0xc0000a0061
n.c 0xc0000a0062
n.d 0xc0000a0063
```

【进阶知识点】关于Go语言中的内存对齐推荐阅读:[在 Go 中恰到好处的内存对齐](https://segmentfault.com/a/1190000017527311?utm_campaign=studygolang.com&utm_medium=studygolang.com&utm_source=studygolang.com)

结构体是值类型，将结构体的内存指针赋值给其他变量，如：stu01 := &stu02。那么他们俩底层指向同一个内存地址



## 4.4 构造函数

```go
type practice struct {
	name string
	age int
	gender string
	hobby []string
}

func newpractice(n string,a int,g string,h []string) *practice { //结构体是值类型，值拷贝性能开销会比较大，所以返回值返回指针节约内存
	return &practice{
		name : n,
		age : a,
		gender : g,
		hobby : h,
    }
}

func main() {
	felix := newpractice("felix",20,"男",[]string{"篮球","网吧"})
	fmt.Println(felix) //&{felix 20 男 [篮球 网吧]}
}
```

### 4.4.2 图书管理作业

```go
package main

import (
	"fmt"
	"os"
)

type book struct {
	title string
	author string
	price float32
	publish bool
}

var (
	bookslice = make([]book,0,100)
)

//判断是否有
func ifbook() int {
	if len(bookslice) == 0 {
		fmt.Println("仓库为空")
	}
	return len(bookslice)
}

//获取用户输入
func input() (t,a string,p float32,pu bool) {
	fmt.Print("请输入书名:")
	fmt.Scanln(&t)
	fmt.Print("请输入作者:")
	fmt.Scanln(&a)
	fmt.Print("请输入价格:")
	fmt.Scanln(&p)
	fmt.Print("是否上市[true/false]:")
	fmt.Scanln(&pu)
	return
}

//添加书籍
func addbook() {
    t,a,p,pu:=input()
	newBook := book{
		t,
		a,
		p,
		pu,
	}
	for _,b := range bookslice {
		if b.title == newBook.title {
			fmt.Printf("《%s》书籍以存在！\n",newBook.title)
			return
		}
	}
	bookslice = append(bookslice, newBook)
}

//修改书籍
func modifybook() {
	var id int
	if ifbook() == 0 {
		return
	}
	fmt.Print("请输入需要修改书籍的id:")
	fmt.Scanln(&id)
	for index,_ := range bookslice {
		if id == index {
			t,a,p,pu:=input()
			bookslice[id] = book{
				t,
				a,
				p,
				pu,
			}
		}
	}
	fmt.Println("此书不存在")

}

//展示所有书籍
func lookbook() {
	ifbook()
	for x,y := range bookslice {
		fmt.Printf("编号:%d|书名:《%s》|作者:%s|价格:%.2f|是否上架:%t\n",x,y.title,y.author,y.price,y.publish)
	}
	fmt.Scanln()
}

func show(){
	fmt.Println(`
上海市图书馆BMS系统:
	1.添加书籍
	2.展示书籍
	3.修改书籍
	4.EXIT
`)
}

func main() {
	for {
		var (
			options int
		)
		show()
		fmt.Scanln(&options)
		switch options {
		case 1:
     	    addbook()
			lookbook()
		case 2:
			lookbook()
		case 3:
			lookbook()
			modifybook()
		default:
			os.Exit(0)
		}
	}
}
```

## 4.5 方法和接收者

Go语言中的`方法（Method）`是一种__作用于特定类型变量的函数__。这种特定类型变量叫做`接收者（Receiver）`。接收者的概念就类似于其他语言中的`this`或者 `self`。

方法的定义格式如下：

```go
func (接收者变量 接收者类型) 方法名(参数列表) (返回参数) {
    函数体
}
```

其中，

- 接收者变量：接收者中的参数变量名在命名时，官方建议使用接收者类型名称首字母的小写，而不是`self`、`this`之类的命名。例如，`Person`类型的接收者变量应该命名为 `p`，`Connector`类型的接收者变量应该命名为`c`等。

- 接收者类型：接收者类型和参数类似，可以是指针类型和非指针类型。

- 方法名、参数列表、返回参数：具体格式与函数定义相同。

举个例子：

```go
package main

import "fmt"

type people struct {
	name string
	age int
	gender string
}

//这个方法的接收者，或此方法只能作用于特点类型的变量，这里指代people
func (p *people)transsexual() { //结构体为值类型所以要将该结构体的内存指针传进来
	p.gender = "女"
	fmt.Printf("%s的梦想是当一条咸鱼\n",p.name)
 //felix的梦想是当一条咸鱼
}

func main(){
	var felix = people { //实例化一个结构体
		name: "felix",
		age:18,
		gender: "男"}

	felix.transsexual()
 //()
	fmt.Println(felix.gender)
 //"女"
}
```

方法与函数的区别是，函数不属于任何类型，方法属于特定的类型。

### 4.5.1 指针类型的接收者★

指针类型的接收者由一个结构体的指针组成，由于指针的特性，调用方法时修改接收者指针的任意成员变量，在方法结束后，修改都是有效的。这种方式就十分接近于其他语言中面向对象中的`this`或者`self`。 例如我们为`Person`添加一个`SetAge`方法，来修改实例变量的年龄。

```go
// SetAge 设置p的年龄
// 使用指针接收者
func (p *Person) SetAge(newAge int8) {
	p.age = newAge
}
```

调用该方法：

```go
func main() {
	p1 := NewPerson("小王子", 25)
	fmt.Println(p1.age) // 25
	p1.SetAge(30)
	fmt.Println(p1.age) // 30
}
```

### 4.5.2 值类型的接收者

当方法作用于值类型接收者时，Go语言会在代码运行时将接收者的值复制一份。在值类型接收者的方法中可以获取接收者的成员值，但修改操作只是针对副本，无法修改接收者变量本身。

```go
// SetAge2 设置p的年龄
// 使用值接收者
func (p Person) SetAge2(newAge int8) {
	p.age = newAge
}

func main() {
	p1 := NewPerson("小王子", 25)
	p1.Dream()
	fmt.Println(p1.age) // 25
	p1.SetAge2(30) // (*p1).SetAge2(30)
	fmt.Println(p1.age) // 25
}
```

### 4.5.3 什么时候应该使用指针类型接收者

1. 需要修改接收者中的值

1. 接收者是拷贝代价比较大的大对象

1. 保证一致性，如果有某个方法使用了指针接收者，那么其他的方法也应该使用指针接收者。

## 4.6 任意类型追加方法

Go语言中，接收者的类型可以是任何类型，不仅仅是结构体，__任何类型都可以拥有方法__。 举个例子，我们基于内置的`int`类型使用type关键字可以定义新的自定义类型，然后为我们的自定义类型添加方法。

```go
//MyInt 将int定义为自定义MyInt类型
type Myint int

//SayHello 为MyInt添加一个SayHello的方法
func (m *Myint) seyHellol(Newint Myint) {
	*m = Newint
	fmt.Printf("Hello Myint%v\n",*m)
}

func main(){
	var f Myint
	fmt.Println(f)
 //0
	f.seyHellol(21)
 //Hello Myint21
	fmt.Println(f)
 //21
}
```

__非本地类型不能定义方法，也就是说我们不能给别的包的类型定义方法。__

## 4.7 结构体的匿名字段

结构体允许其成员字段在声明时没有字段名而只有类型，这种没有名字的字段就称为匿名字段。

```go
//Person 结构体Person类型
type Person struct {
	string
	int
}

func main() {
	p1 := Person{
		"小王子",
		18,
	}
	fmt.Printf("%#v\n", p1)        //main.Person{string:"北京", int:18}
	fmt.Println(p1.string, p1.int) //北京 18
}
```

**注意：**这里匿名字段的说法并不代表没有字段名，而是默认会__采用类型名作为字段名__，结构体要求字段名称必须唯一，因此一个结构体中同种类型的匿名字段只能有一个。

## 4.8 嵌套结构体

```go
type adderss struct {
 //结构体存储地址
    province string
    village string
}

type user struct {
 //结构体存储用户
	name string
	age int
	adder adderss
 //用户结构体中嵌套了地址结构体
}

func main() {
	user1 := user{
		name: "feili",
		age: 18,
		adder: adderss{
 //嵌套结构体初始化
			"shanghai",
			"zhangjiang",
		},
	}
	fmt.Println(user1)
 //{feili 18 {shanghai zhangjiang}}
	fmt.Println(user1.name,user1.age,user1.adder.village)
 //feili 18 zhangjiang
}
```

## 4.9 嵌套匿名结构体

```go
type adder struct {
	country string
	province string
	city string
}

type employee struct {
	name string
	age int
	gender string
	adder //嵌套了匿名结构体
}

func main() {
	var felix = employee{
		name:"felix",
		age:18,
		gender:"男",
		adder:adder {
			"中国",
			"安徽",
			"上海",
		},
	}
	fmt.Println(felix)
	fmt.Println(felix.city) //直接寻找adder结构体中的city 上海
}
```

## 4.10 结构体的继承

```go
type animal struct {
	name string
}

func (m *animal) move() { //为动物定义一个方法
	fmt.Printf("%s会动\n",m.name)
}

type Dog struct {
	foot int
	*animal //dog结构体嵌套了动物结构体，所以dog也继承了动物的方法move
}

func (w *Dog) wang(){
	fmt.Printf("%s会汪汪汪",w.name)
}

func main() {
	var wangcai = Dog{
		foot: 4,
		animal: &animal { //dog中嵌套了动物结构体，也继承了动物的方法
			name: "旺财",
		},
	}
	wangcai.move() //旺财会动
	wangcai.wang() //旺财会汪汪汪
}
```

## 4.11 结构体字段的可见性

结构体中字段大写开头表示可公开访问，小写表示私有（仅在定义当前结构体的包中可访问）。

# 5.JSON序列化

```go
type Learngod struct { //josn包能访问到字段必须为大写
	ID int `json:"id"`
 //定义元数据，当json包进行序列化操作时，key为小写
	Gender string `json:"gender"`
	Name string`json:"name"`
}

func main() {
	learngod1 := Learngod{
		ID:1,
		Gender: "男",
		Name: "Felix",
	}
	//序列化：吧编程语言里的数据转换成 JSON格式的字符串
	v ,err := json.Marshal(learngod1) //返回一个[]byte类型的返回值和error错误信息
	if err != nil {
		fmt.Printf("Json序列化失败%s",err)
	}
	fmt.Println(v) //[]byte
	//[123 34 73 68 34 58 49 44 34 71 101 110 100 101 114 34 58 34 231 148 183 34 44 34 78 97 109 101 34 58 34 70 101 108 105 120 34 125]
	fmt.Printf("%#v\n",string(v)) //string
	//"{\"ID\":1,\"Gender\":\"男\",\"Name\":\"Felix\"}"

	str := "{\"ID\":1,\"Gender\":\"男\",\"Name\":\"Felix\"}"
	//反序列化：吧满足JSON格式的字符串转换成 当前编程语言里的对象
	var learngod2 = &Learngod{}
	json.Unmarshal([]byte(str),learngod2)
 //将json字符串转换为[]byte类型的切片，并赋给learngod2
	fmt.Printf("%T\n%v",learngod2,learngod2)
}
```

## 5.1 结构体标签（Tag）

`Tag`是结构体的元信息，可以在运行的时候通过反射的机制读取出来。 `Tag`在结构体字段的后方定义，由一对**反引号**包裹起来，具体的格式如下：

```bash
`key1:"value1" key2:"value2"`
```

结构体tag由一个或多个键值对组成。键与值使用冒号分隔，值用双引号括起来。同一个结构体字段可以设置多个键值对tag，不同的键值对之间使用空格分隔。

**注意事项：** 为结构体编写`Tag`时，必须严格遵守键值对的规则。结构体标签的解析代码的容错能力很差，一旦格式写错，编译和运行时都不会提示任何错误，通过反射也无法正确取值。例如不要在key和value之间添加空格。例如我们为`Student`结构体的每个字段定义json序列化时使用的Tag

# 6.SMS[面向对象]

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
)

//学员结构体，面向对象
type Student struct {
	Id int `json:"id"`
	Name string `json:"name"`
	Age int `json:"age"`
	Class string `json:"class"`
}

//学院结构体
type College struct {
	AllStudent []*Student
}

//学员构造函数
func NewStudent(id int,name string,age int,class string) *Student {
	return &Student{
		Id :id,
		Name : name,
		Age : age,
		Class: class,
	}
}

//学院构造函数
func NewCollege() *College {
	return &College{
		AllStudent: make([]*Student,0,100),
 //初始化结构体中的切片
	}
}

//添加学生
func (c *College) add(s *Student) {
	for _,v := range c.AllStudent {
		if v.Name == s.Name {
			fmt.Printf("%v已存在",s.Name)
			return
		}
	}
	c.AllStudent = append(c.AllStudent,s)
}

//删除学生
func (c *College) del(s *Student) {
	for index ,v := range c.AllStudent {
		if v.Name == s.Name {
			c.AllStudent = append(c.AllStudent[:index],c.AllStudent[index+1:]...)
		}
	}
	fmt.Printf("%v不存在",s.Name)
}

//修改学生
func (c *College) modify(s *Student) {
	for index,v := range c.AllStudent {
		if v.Name == s.Name {
			c.AllStudent[index] = s
		}
	}
	fmt.Printf("%v不存在",s.Name)
}

//查询学生
func (c *College) show() {
	for _,v := range c.AllStudent{
		json,err:=json.Marshal(v)
		if err!= nil {
			fmt.Println("json序列化失败")
			return
		}
		fmt.Println(string(json))
	}
}

//获取用户输入
func input() *Student {
	var (
		id int
		name string
		age int
		class string
	)
	fmt.Print("请输入学员学号: ")
	fmt.Scanln(&id)
	fmt.Print("请输入学员姓名: ")
	fmt.Scanln(&name)
	fmt.Print("请输入学员年龄: ")
	fmt.Scanln(&age)
	fmt.Print("请输入学员班级: ")
	fmt.Scanln(&class)
	return NewStudent(id,name,age,class)
}

func showMenu() {
	fmt.Println(`
	1.添加学生
	2.删除学生
	3.查看学生
	4.修改学生
	5.Exit
`)
}

func main() {
	stuMar := NewCollege()
	for {
		showMenu()
		Select := 0
		fmt.Print("请输入指令: ")
		fmt.Scanln(&Select)
		switch Select {
		case 1:
			stuMar.add(input())
		case 2:
			stuMar.del(input())
		case 3:
			stuMar.show()
		case 4:
			stuMar.modify(input())
		case 5:
			os.Exit(0)
		default:
			fmt.Println("输入无效")
		}
	}
}
```

# 7. return执行原理和defer执行时机

在Go语言的函数中`return`语句在底层并不是原子操作，它分为给返回值赋值和RET指令两步。而`defer`语句执行的时机就在返回值赋值操作后，RET指令（结束一段代码）执行前。具体如下图所示：


![return执行原理和defer执行时机](/images/pasted-3.png)

## 7.1 defer经典案例

阅读下面的代码，写出最后的打印结果。

```go
func f1() int {
	x := 5
	defer func() { //返回5，1.返回值=5 2.x++ 3.RET指令 ==> 5
		x++
	}()
	return x
}

func f2() (x int) {
	defer func() {
		x++
	}()
	return 5 // 返回6，1.返回值=x(5) 2.x++ 3.RET指令 ==> 6
}

func f3() (y int) {
	x := 5
	defer func() {
		x++
	}()
	return x // 返回5，1.返回值=y=x(5) 2.x++ 3.RET指令 ==> 5
}
func f4() (x int) {
	defer func(x int) {
		x++
	}(x)
	return 5 // 返回5，1.返回值=x(5) 2.匿名函数内x++ 3.RET指令 ==> 5
}
func main() {
	fmt.Println(f1())
	fmt.Println(f2())
	fmt.Println(f3())
	fmt.Println(f4())
}
```

# 8.golang中的包

在工程化的Go语言开发项目中，Go语言的源码复用是建立在包（package）基础之上的。本文介绍了Go语言中如何定义包、如何导出包的内容及如何导入其他包。

Go语言的包（package）

## 8.1 包介绍

`包（package）`是多个Go源码的集合，是一种高级的代码复用方案，Go语言为我们提供了很多内置包，如`fmt`、`os`、`io`等。

## 8.2 定义包

我们还可以根据自己的需要创建自己的包。一个包可以简单理解为一个存放`.go`文件的文件夹。 该文件夹下面的所有go文件都要在代码的第一行添加如下代码，声明该文件归属的包。

```go
package 包名
```

注意事项：

- 一个文件夹下面直接包含的文件只能归属一个`package`，同样一个`package`的文件不能在多个文件夹下。

- 包名可以不和文件夹的名字一样，包名不能包含 `-` 符号。

- 包名为`main`的包为应用程序的入口包，这种包编译后会得到一个可执行文件，而编译不包含`main`包的源代码则不会得到可执行文件。

## 8.3 可见性

如果想在一个包中引用另外一个包里的标识符（如变量、常量、类型、函数等）时，该标识符必须是对外可见的（public）。在Go语言中只需要将标识符的首字母大写就可以让标识符对外可见了。

举个例子， 我们定义一个包名为`pkg2`的包，代码如下：

```go
package pkg2

import "fmt"

// 包变量可见性

var a = 100 // 首字母小写，外部包不可见，只能在当前包内使用

// 首字母大写外部包可见，可在其他包中使用
const Mode = 1

type person struct { // 首字母小写，外部包不可见，只能在当前包内使用
	name string
}

// 首字母大写，外部包可见，可在其他包中使用
func Add(x, y int) int {
	return x + y
}

func age() { // 首字母小写，外部包不可见，只能在当前包内使用
	var Age = 18 // 函数局部变量，外部包不可见，只能在当前函数内使用
	fmt.Println(Age)
}

```

结构体中的字段名和接口中的方法名如果首字母都是大写，外部包可以访问这些字段和方法。例如：

```go
type Student struct {
	Name  string //可在包外访问的方法
	class string //仅限包内访问的字段
}

type Payer interface {
	init() //仅限包内访问的方法
	Pay()  //可在包外访问的方法
}

```

## 8.4 包的导入

要在代码中引用其他包的内容，需要使用`import`关键字导入使用的包。具体语法如下:

```go
import "包的路径"
```

注意事项：

- import导入语句通常放在文件开头包声明语句的下面。

- 导入的包名需要使用双引号包裹起来。

- 包名是从`$GOPATH/src/`后开始计算的，使用`/`进行路径分隔。

- Go语言中禁止循环导入包。

### 8.4.1 单行导入

单行导入的格式如下：

```go
import "包1"
import "包2"
```

### 8.4.2 多行导入

多行导入的格式如下：

```go
import (
    "包1"
    "包2"
)
```

## 8.5 自定义包名

在导入包名的时候，我们还可以为导入的包设置别名。通常用于导入的包名太长或者导入的包名冲突的情况。具体语法格式如下：

```go
import 别名 "包的路径"
```

单行导入方式定义别名：

```go
import "fmt"
import m "github.com/Q1mi/studygo/pkg_test"

func main() {
	fmt.Println(m.Add(100, 200))
	fmt.Println(m.Mode)
}
```

多行导入方式定义别名：

```go
import (
    "fmt"
    m "github.com/Q1mi/studygo/pkg_test"
 )

func main() {
	fmt.Println(m.Add(100, 200))
	fmt.Println(m.Mode)
}

```

## 8.6 匿名导入包

如果只希望导入包，而不使用包内部的数据时，可以使用匿名导入包。具体的格式如下：

```go
import _ "包的路径"
```

匿名导入的包与其他方式导入的包一样都会被编译到可执行文件中。

## 8.7 init()初始化函数

### 8.7.1 init()函数介绍

在Go语言程序执行时导入包语句会自动触发包内部`init()`函数的调用。需要注意的是： `init()`函数没有参数也没有返回值。 `init()`函数在程序运行时自动被调用执行，不能在代码中主动调用它。

包初始化执行的顺序如下图所示：


![包初始化](/images/pasted-4.png)

### 8.7.2 init()函数执行顺序

Go语言包会从`main`包开始检查其导入的所有包，每个包中又可能导入了其他的包。Go编译器由此构建出一个树状的包引用关系，再根据引用顺序决定编译顺序，依次编译这些包的代码。在运行时，被最后导入的包会最先初始化并调用其`init()`函数， 如下图示：


![包初始化](/images/pasted-5.png)

## 8.8 time包

time包提供了时间的显示和测量用的函数。日历的计算采用的是公历。

### 8.8.1 时间类型

`time.Time`类型表示时间类型。我们可以通过`time.Now()`函数获取当前的时间对象，然后获取时间对象的年月日时分秒等信息。示例代码如下

```go
func timeDemo() {
	now := time.Now() //获取当前时间
	fmt.Printf("current time:%v\n", now)

	year := now.Year()     //年
	month := now.Month()   //月
	day := now.Day()       //日
	hour := now.Hour()     //小时
	minute := now.Minute() //分钟
	second := now.Second() //秒
	fmt.Printf("%d-%02d-%02d %02d:%02d:%02d\n", year, month, day, hour, minute, second)
}
```

### 8.8.2 时间戳

时间戳是自1970年1月1日（08:00:00GMT）至当前时间的总毫秒数。它也被称为Unix时间戳（UnixTimestamp）。

基于时间对象获取时间戳的示例代码如下：

```go
func timestampDemo() {
	now := time.Now()            //获取当前时间
	timestamp1 := now.Unix()     //时间戳
	timestamp2 := now.UnixNano() //纳秒时间戳
	fmt.Printf("current timestamp1:%v\n", timestamp1)
	fmt.Printf("current timestamp2:%v\n", timestamp2)
}

```

使用`time.Unix()`函数可以将时间戳转为时间格式。

```go
func timestampDemo2(timestamp int64) {
	timeObj := time.Unix(timestamp, 0) //将时间戳转为时间格式
	fmt.Println(timeObj)
	year := timeObj.Year()     //年
	month := timeObj.Month()   //月
	day := timeObj.Day()       //日
	hour := timeObj.Hour()     //小时
	minute := timeObj.Minute() //分钟
	second := timeObj.Second() //秒
	fmt.Printf("%d-%02d-%02d %02d:%02d:%02d\n", year, month, day, hour, minute, second)
}
```

### 8.8.3 时间间隔

`time.Duration`是`time`包定义的一个类型，它代表两个时间点之间经过的时间，以纳秒为单位。`time.Duration`表示一段时间间隔，可表示的最长时间段大约290年。

time包中定义的时间间隔类型的常量如下：

```go
const (
    Nanosecond  Duration = 1
    Microsecond          = 1000 * Nanosecond
    Millisecond          = 1000 * Microsecond
    Second               = 1000 * Millisecond
    Minute               = 60 * Second
    Hour                 = 60 * Minute
)

```

例如：`time.Duration`表示1纳秒，`time.Second`表示1秒。

### 8.8.4 时间操作

### Add 

我们在日常的编码过程中可能会遇到要求时间+时间间隔的需求，Go语言的时间对象有提供Add方法如下：

```go
func (t Time) Add(d Duration) Time

```

举个例子，求一个小时之后的时间：

```go
func main() {
	now := time.Now()
	later := now.Add(time.Hour) // 当前时间加1小时后的时间
	fmt.Println(later)
}

```

### Sub

求两个时间之间的差值：

```go
func (t Time) Sub(u Time) Duration

```

返回一个时间段t-u。如果结果超出了Duration可以表示的最大值/最小值，将返回最大值/最小值。要获取时间点t-d（d为Duration），可以使用t.Add(-d)。

### Equal

```go
func (t Time) Equal(u Time) bool

```

判断两个时间是否相同，会考虑时区的影响，因此不同时区标准的时间也可以正确比较。本方法和用t==u不同，这种方法还会比较地点和时区信息。

### Before

```go
func (t Time) Before(u Time) bool

```

如果t代表的时间点在u之前，返回真；否则返回假。

### After

```go
func (t Time) After(u Time) bool

```

如果t代表的时间点在u之后，返回真；否则返回假。

### 8.8.5 定时器

使用`time.Tick(时间间隔)`来设置定时器，定时器的本质上是一个通道（channel）。

```go
func tickDemo() {
	ticker := time.Tick(time.Second) //定义一个1秒间隔的定时器
	for i := range ticker {
		fmt.Println(i)//每秒都会执行的任务
	}
}
```

### 8.8.6 时间格式化

时间类型有一个自带的方法`Format`进行格式化，需要注意的是Go语言中格式化时间模板不是常见的`Y-m-d H:M:S`而是使用Go的诞生时间2006年1月2号15点04分（记忆口诀为2006 1 2 3 4）。也许这就是技术人员的浪漫吧。补充：如果想格式化为12小时方式，需指定`PM`。

```go
func formatDemo() {
	now := time.Now()
	// 格式化的模板为Go的出生时间2006年1月2号15点04分 Mon Jan
	// 24小时制
	fmt.Println(now.Format("2006-01-02 15:04:05.000 Mon Jan"))
	// 12小时制
	fmt.Println(now.Format("2006-01-02 03:04:05.000 PM Mon Jan"))
	fmt.Println(now.Format("2006/01/02 15:04"))
	fmt.Println(now.Format("15:04 2006/01/02"))
	fmt.Println(now.Format("2006/01/02"))
}
```

解析字符串格式的时间

```go
now := time.Now()
fmt.Println(now)
// 加载时区
loc, err := time.LoadLocation("Asia/Shanghai")
if err != nil {
	fmt.Println(err)
	return
}
// 按照指定时区和指定格式解析字符串时间
timeObj, err := time.ParseInLocation("2006/01/02 15:04:05", "2019/08/04 14:15:20", loc)
if err != nil {
	fmt.Println(err)
	return
}
fmt.Println(timeObj)
fmt.Println(timeObj.Sub(now))
```

