const express = require("express");
const mongoose = require('./mongoose');
const {User, Reimbursement} = require("./models")
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const z  = require("zod");
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express()
app.use(express.json())



const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//to be stored in .env file
const jwtPass = "xy4hs#hjsaI8sbklailJHGa"


//form validation schemas for registration and request
const registrationSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role : z.enum(['admin', 'employee']),
    fname : z.string().min(3)
  });

const reimbursementValidationSchema = z.object({
  date: z.coerce.date().refine((value) => !isNaN(value.getTime()), {
    message: 'Invalid date format',
  }),
  amount: z.coerce.number().positive(),
  paymentType: z.enum(['cash', 'creditCard', 'debitCard']),
  outOfPocket: z.array(z.enum(['food', 'lodging', 'other'])),
  materialTransportation: z.string().optional(),
  otherReason: z.string().optional(),
  raisedBy: z.string().min(1),
  remarks: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});



//middlewares to authenticate token and check user's role
const authenticateToken = (req, res, next) => {
  let token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  //This part is for swagger, as it sends token as 'Bearer xxxxxxxxxxxxx'
  if (token.includes(" ")){
    token = token.split(" ")[1]
  }
  console.log(token)

  

  jwt.verify(token, jwtPass, (err, user) => {
    if (err) {
      console.log(err)
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    req.user = user;
    next();
  });
};

const checkUserRole =  (requiredRole) => {
  return async (req, res, next ) => {
    
    const userEmail = req.user.email;
    const user = await User.findOne({email : userEmail})
    if (user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient Permission' });
    }

    next();
  };
};



////////////////////API ENDPOINTS


//register
app.post('/register', async (req, res) => {
   try {
    const {email, password ,role, fname} = registrationSchema.parse(req.body) ;
    const hashedPassword = await bcrypt.hash(password, 10);


    const newUser = new User({
      email: email,
      password: hashedPassword,
      role : role,
      fname : fname
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', details: error.errors });
  } else {
      console.log(error)
    res.status(500).json({ error: 'Internal Server Error' });
  }
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      var token = jwt.sign({ email: email }, jwtPass);
      return res.json({
          token,
  });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//logout
app.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
});


// Submit reimbursement request
app.post('/submit-reimbursement',authenticateToken,checkUserRole("employee"), async (req, res) => {
  try {
    reimbursementValidationSchema.parse(req.body)
    const employeeId = req.body.raisedBy
    console.log(employeeId)
    const user = await User.findOne({_id : employeeId})
    
    req.body.raisedBy = {
      fname : user.fname,
      email : user.email,
      employeeId : user._id
    }
    const reimbursement = new Reimbursement(req.body);
    await reimbursement.save();
    res.status(201).json({ message: 'Reimbursement request submitted successfully' });
  } catch (error) {
      if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        }else{
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});



// Fetch all requests for admins
app.get('/admin/requests',authenticateToken,checkUserRole("admin") ,async (req, res) => {
  try {
    const requests = await Reimbursement.find();
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Filter requests by employee name or status
app.get('/admin/requests/filter',authenticateToken,checkUserRole("admin"),async (req, res) => {
  const { employeeName, status } = req.query;
  console.log(req.query)

  try {
    let query = {};

    if (employeeName) {
      query['raisedBy.fname'] = employeeName; 
    }

    if (status) {
      query.status = status;
    }

    const filteredRequests = await Reimbursement.find(query);
    res.status(200).json(filteredRequests);
    
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Accept/reject requests
app.patch('/admin/requests/:id',authenticateToken,checkUserRole("admin"), async (req, res) => {
  const {id } = req.params;
  const { status } = req.body;
  
  console.log(id)

  try {
    reimbursementValidationSchema.pick({ status: true }).parse({ status });
    const reimbursement = await Reimbursement.findByIdAndUpdate({_id:id}, { status });

    if (!reimbursement) {
      return res.status(404).json({ error: 'Reimbursement request not found' });
    }

    res.status(200).json({message: `Reimbursement request ${status} successfully`});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.listen(3000,()=>{
    console.log(`Server is running on http://localhost:3000`);
})















