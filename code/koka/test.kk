
effect ask
  fun ask() : string
  fun ask2() : string

fun hello()
  val name = ask()
  println("Hello " ++ name ++ ", " ++ ask2())  // "Hello <ask>, <ask>"

struct hello
  name: string

fun main()
  with handler
    fun ask() ""
    fun ask2() "+"
  hello()
  val h = Hello("hi")
  h.name.println
