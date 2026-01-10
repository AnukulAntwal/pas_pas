import Rating from "../models/Rating.js";
import DeliveryService from "../models/DeliveryService.js";
import User from "../models/User.js";

export const rateDelivery = async (req, res) => {
  try {
    const { delivery_id, rating, review } = req.body;
    const fromUser = req.user._id;

    // 1️⃣ Delivery check
    const delivery = await DeliveryService.findById(delivery_id);
    if (!delivery || !delivery.is_completed) {
      return res.status(400).json({
        status:"fail",
        message: "Delivery not completed yet",
        data:[]
      });
    }

    // 2️⃣ Already rated?
    if (delivery.is_rated) {
      return res.status(400).json({
        status:"fail",
        message: "Rating already submitted",
        data:[]
      });
    }

    // 3️⃣ Save rating
   const ratingData =  await Rating.create({
      delivery_id,
      from_user: fromUser,
      to_user: delivery.uid,
      rating,
      review
    });

    // 4️⃣ Update user rating summary
    const user = await User.findById(delivery.uid);
    const newCount = user.rating_count + 1;
    const newAvg =
      (user.rating_avg * user.rating_count + rating) / newCount;

    user.rating_avg = Number(newAvg.toFixed(1));
    user.rating_count = newCount;
    await user.save();

    // 5️⃣ Mark delivery rated
    delivery.is_rated = true;
    await delivery.save();

    return res.status(200).json({
        status:"success",
      message: "Rating submitted successfully",
      data: ratingData
    });

  } catch (err) {
    res.status(500).json({status:"fail", message: err.message, data: [] });
  }
};

export const getUserRatingSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "first_name last_name profile_image rating_avg rating_count"
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
        data: []
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User rating summary fetched successfully",
      data: {
        user_id: user._id,
        user_name: `${user.first_name} ${user.last_name}`,
        rating_avg: user.rating_avg || 0,
        rating_count: user.rating_count || 0,
        profile_image: user.profile_image
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Rating.find({ to_user: userId })
      .populate("from_user", "first_name last_name profile_image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      message: "User reviews fetched successfully",
      data: reviews.map(r => ({
        rating: r.rating,
        review: r.review,
        review_date: r.createdAt,
        reviewer_id: r.from_user?._id || null,
        reviewer_name: r.from_user
          ? `${r.from_user.first_name} ${r.from_user.last_name}`
          : "Unknown",
        reviewer_image: r.from_user?.profile_image || null
      }))
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });
  }
};
