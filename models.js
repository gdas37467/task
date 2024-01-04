const mongoose = require('./mongoose');
const userSchema = new mongoose.Schema({email: String,
    password: String,
    role: String,
    fname : String})


  const reimbursementSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    paymentType: { type: String, enum: ['cash', 'creditCard', 'debitCard'], required: true },
    outOfPocket: { type: [String], enum: ['food', 'lodging', 'other'] },
    materialTransportation: { type: String },
    otherReason: { type: String },
    raisedBy: {
      employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      email: { type: String },
      fname : { type : String}
    },
    remarks: {type :String},
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  });
  const User = mongoose.model("User", userSchema);
  const Reimbursement = mongoose.model('Reimbursement', reimbursementSchema);

module.exports = {User,Reimbursement}