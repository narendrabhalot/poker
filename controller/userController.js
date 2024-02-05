const UserModel = require('../models/userModel');
const createUser = async (req, res) => {
  try {
    const { name, email, age, password } = req.body;
    const user = new UserModel({ name, email, age, password });
    await user.save();
    res.status(201).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await UserModel.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller function for updating a user by ID
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, age } = req.body;
    const user = await UserModel.findByIdAndUpdate(userId, { name, email, age }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller function for deleting a user by ID
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findByIdAndRemove(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createUser, listUsers, getUserById, updateUser, deleteUser }