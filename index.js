const express = require('express');
const bodyParser = require('body-parser')
const multer = require('multer')
const emailValidator = require('email-validator')
const fs = require('fs')
const uuid = require('short-uuid')
const session = require('express-session')
require('dotenv').config()

const app = express()
let productList = new Map()

const upload = multer({dest:'uploads',
fileFilter:(req,file,callback)=>{
    if(file.mimetype.startsWith('image/')){
        callback(null,true)
    }
    else callback(null,false)
},limits:{fileSize:500000}})

app.set('view engine','ejs')
app.use('/uploads', express.static('uploads'))
app.use(session({secret:'secret_password_here'}))
app.use(bodyParser.urlencoded({extended:true}))


app.get('/',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login')
    }
    else res.render('index',{products: Array.from(productList.values())})
})

app.get('/product/:id', (req,res)=>{
    let id = req.params.id
    let product = productList.get(id)
    res.render('product',{product})
})

app.get('/edit/:id', (req, res) => {
    let id = req.params.id
    let product = productList.get(id)
    if (!product) {
        return res.status(404).render('error', {
            title: 'Product Not Found',
           message: 'The product you are trying to edit does not exist.'
        });
    }
    res.render('edit',{product,error:''})     
})
app.post('/edit/:id', (req, res) => {
    let id = req.params.id;
    let product = productList.get(id);

    if (!product) {
        return res.status(404).render('error', {
            title: 'Product Not Found',
            message: 'The product you are trying to update does not exist.'
        });
    }

    let { name, price, desc } = req.body;

    let error = undefined;
    if (!name || name.trim().length === 0) {
        error = 'Please enter a valid name.';
    } else if (!price || isNaN(price) || parseFloat(price) < 0) {
        error = 'Please enter a valid price.';
    } else if (!desc || desc.trim().length === 0) {
        error = 'Please enter a valid description.';
    }

    if (error) {
        return res.render('edit', { product, error });
    }

    product.name = name;
    product.price = parseFloat(price);
    product.desc = desc;

    productList.set(id, product);

    res.redirect('/?message=Product updated successfully');
})

app.get('/add',(req,res)=>{
    res.render('add',{error:'',name:'',price:'',desc:''})
})
app.post('/add',(req,res)=>{
    let uploader = upload.single('image')
    uploader(req,res,err =>{
        let {name,price,desc} = req.body
        let image = req.file

        let error = undefined
        if(!name||name.length === 0){
            error = 'Vui lòng nhập tên hợp lệ'
        }else if(!price || price.length ===0){
            error = 'Vui lòng nhập giá hợp lệ'
        }else if(isNaN(price) || parseInt(price)<0){
            error = 'Giá không hợp lệ'
        }else if(!desc || desc.length ===0){
            error = 'Vui lòng nhập mô tả sản phẩm'
        }else if(err){
            error = 'Ảnh quá lớn'
        }
        else if(!image){
            error = 'Chưa có ảnh hoặc ảnh không hợp lệ'
        }

        if(error){
            res.render('add',{error,name,price,desc})
        }
        else {
            let imagePath = `uploads/${image.originalname}`
            fs.renameSync(image.path, imagePath)

            let product = {
                id: uuid.generate(),
                name: name,
                price: parseInt(price),
                desc: desc,
                image: imagePath
            }
            productList.set(product.id,product)
            res.redirect('/')
        }
    })
})

app.get('/',(req,res)=>{
    res.send('Trang chu')
})

app.get('/login',(req,res)=>{
    if(req.session.user){
        res.redirect('/')
    }
    else res.render('login',{email:'',password:''})
})
app.post('/login',(req,res)=>{
    let acc = req.body
    let error =''
    if(!acc.email){
        error ='Vui lòng nhập email'
    }
    else if(!emailValidator.validate(acc.email)){
         error ='Email không đúng định dạng'
    }
    else if(!acc.password){
         error ='Vui lòng nhập pass'
    }
    else if(acc.password.length <6){
         error ='Pass phải có từ 6 kí tự'
    }
    else if(acc.email !== process.env.EMAIL || acc.password != process.env.PASSWORD){
        error = 'Sai email hoặc password'
    }
    if(error.length >0){
        res.render('login',{errorMessage: error, email:acc.email, password:acc.password})
    }else{
        req.session.user = acc.email
        res.set('Content-Type','text/html')
        res.redirect('/')
    }
})

app.post('/delete',(req,res)=>{
    let {id} = req.body
    if(!id){
        res.json({code:1, message:'Mã sản phẩm không hợp lệ'})
    }
    else if (!productList.has(id)){
        res.json({code:2, message:'Không tìm thấy sản phẩm nào'})
    }
    else {
        let p = productList.get(id)
        productList.delete(id)
        res.json({code:0, message:'Đã xóa sản phẩm thành công',data:p})
    }
})

app.get('/error',(req,res)=>{
    res.render('error')
})

app.use((req,res)=>{
    res.set('Content-Type','text/html')
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.'
    });
})


let port = process.env.PORT || 8080

app.listen(port, ()=> console.log('http://localhost:'+port))