const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://gdas37467:qjI640ppwaVTuOox@binbag.nwsxnhl.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = mongoose