import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";

// ✅ Login Controller
export const loginController = async (req, res) => {
  // 1. Validate request body
  const { error } = loginValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const { email, password } = req.body;

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ⚡ If you want password hashing with bcrypt:
    // const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword) {
    //   return res.status(401).json({ error: "Invalid email or password" });
    // }

    // 3. If matched → success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ✅ Register Controller
export const registerController = async (req, res) => {
  // 1. Validate request body
  const { error } = registerValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const { email } = req.body;

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // ⚡ If you want password hashing:
    // const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // 3. Create new user
    const newUser = new User({
      ...req.body,
      // password: hashedPassword   // if bcrypt used
    });

    await newUser.save();

    // 4. Success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
