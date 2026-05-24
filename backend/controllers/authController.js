const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { readjson, writejson } = require('../data/index')

const authController = {
    register: (req,res) => {
        //1. 接收请求参数
        const {username,password} = req.body

        //2. 校验参数是否完整
        if(!username || !password){
            return res.status(400).json({
                code: 400, message:"用户名或密码不能为空",data:null
            })
        }

        //3. 读取现有用户
        const users = readjson('users.json') || []

        //4.检查用户名是否重复
        const exists = users.find(user => user.username === username)
        if(exists){
            return res.status(400).json({
                code: 400, message:"用户名已存在",data:null
            })
        }

        //5.生成用户id（取最大id+1）    
        const maxId = users.length > 0 ? Math.max(...users.map(user => user.id)) : 0

        //6.bcrypt加密密码（10轮）
        const hashPassword = bcrypt.hashSync(password,10)

        //7.创建新用户
        const newUser = {
            id:maxId+1,
            username,
            password:hashPassword,
            nickname:username,
            createAt:new Date().toISOString()
        }

        //8.写入文件  
        users.push(newUser)
        writejson('users.json',users)  

        //9.返回成功（不返回密码）
        const { password: _, ...userWithoutPassword } = newUser
        res.json({
            code: 0, message:"注册成功",data:userWithoutPassword
        })
    },
    login: (req,res) => {
    //1.获取参数
    const { username,password} = req.body 

    //2.验证参数
    if(!username || !password){
        return res.status(400).json({
            code:400 ,message:"用户名或密码不能为空",data:null
        }) 

    }
    //3.读取用户列表
    const users = readjson('users.json')||[]
    //4.查找用户
    const user = users.find(user => user.username === username)
    if(!user){
        return res.status(400).json({
            code:400 ,message:"用户名不存在",data:null
        })
    }
    //5.验证密码
    if(!bcrypt.compareSync(password,user.password)){
        return res.status(400).json({
            code:400,message:"密码错误",data:null
        })
    }
    //6.签发jwt
    const token = jwt.sign({userId:user.id,username:user.username},process.env.JWT_SECRET,{expiresIn:'7d'})
    const { password:_, ...userinfo } = user
    //7.返回token和用户信息
    res.json({
        code:0,
        message:"登录成功",
        data:{
            token,
            user:userinfo
        }
    })
    },
    getMe: (req,res) => {
       res.json({
        code:0,
        message:"获取用户信息成功",
        data:req.user
       })
    }

}
module.exports = authController