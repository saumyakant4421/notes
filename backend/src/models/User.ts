import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, unique: true, required: true },
  googleId: { type: String }, 
});

export default model('User', userSchema);