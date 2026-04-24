import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Package from "../models/Package.js";
import DeliveryService from "../models/DeliveryService.js";
import path from "path";
import { deleteOldFile } from "../utils/deleteOldFile.js";

const formatDate = (date) => date.toISOString().slice(0, 10);

const getLastNDates = (days) => {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const nextDate = new Date(current);
    nextDate.setDate(current.getDate() - i);
    dates.push(formatDate(nextDate));
  }
  return dates;
};

const buildZeroFilledTimeSeries = (dates, valueKey = "value") =>
  dates.map((date) => ({ date, [valueKey]: 0 }));

const mergeCountMap = (dates, records, valueKey) => {
  const map = records.reduce((acc, record) => {
    acc[record._id] = record.count || record[valueKey] || 0;
    return acc;
  }, {});

  return dates.map((date) => ({ date, [valueKey]: map[date] || 0 }));
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    ;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const processedUsers = users.map((user) => {
      const userObj = user.toObject();

      /* ================= PROFILE IMAGE ================= */
      if (userObj.profile_image) {
        userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
      }

      /* ================= PAN IMAGE ================= */
      if (userObj.pan_image) {
        userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
      }

      /* ================= AADHAAR IMAGES ================= */
      if (userObj.aadhar_front_image) {
        userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
      }

      if (userObj.aadhar_back_image) {
        userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
      }

      return userObj;
    });

    res.status(200).json({
        status: true,
        message: "Users fetched successfully",
        data: processedUsers
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
export const getPendingUsers=async(req,res)=>{

};
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userObj = user.toObject();

    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    }
    if (userObj.pan_image) {
      userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
    }
    if (userObj.aadhar_front_image) {
      userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
    }
    if (userObj.aadhar_back_image) {
      userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
    }

    res.status(200).json({
      status: true,
      data: userObj
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server Error", error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsersPromise = User.countDocuments({});
    const activeUsersPromise = User.countDocuments({ is_blocked: 0 });
    const blockedUsersPromise = User.countDocuments({ is_blocked: 1 });
    const totalVerifiedUsersPromise = User.countDocuments({ is_verified_user: 1 });
    const pendingVerificationsPromise = User.countDocuments({
      $or: [{ is_valid_adhar: 0 }, { is_valid_pan: 0 }],
    });
    const newUsersTodayPromise = User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalVerifiedUsers,
      pendingVerifications,
      newUsersToday,
    ] = await Promise.all([
      totalUsersPromise,
      activeUsersPromise,
      blockedUsersPromise,
      totalVerifiedUsersPromise,
      pendingVerificationsPromise,
      newUsersTodayPromise,
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalVerifiedUsers,
        pendingVerifications,
        newUsersToday,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminDashboardKPIs = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 30);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalVerifiedUsers,
      pendingVerifications,
      totalPackages,
      totalDeliveryServices,
      totalBookings,
      bookedPackages,
      bookedServices,
      availablePackages,
      availableServices,
      cancelledPackages,
      cancelledServices,
      completedPackages,
      completedServices,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ is_blocked: 0 }),
      User.countDocuments({ is_blocked: 1 }),
      User.countDocuments({ is_verified_user: 1 }),
      User.countDocuments({ is_verified_user: 0 }),
      Package.countDocuments({}),
      DeliveryService.countDocuments({}),
      Booking.countDocuments({}),
      Package.countDocuments({ booking_type: "Booked" }),
      DeliveryService.countDocuments({ booking_type: "Booked" }),
      Package.countDocuments({ booking_type: "Available" }),
      DeliveryService.countDocuments({ booking_type: "Available" }),
      Package.countDocuments({ booking_type: "Cancelled" }),
      DeliveryService.countDocuments({ booking_type: "Cancelled" }),
      Package.countDocuments({ booking_type: "Booked", is_completed: 1 }),
      DeliveryService.countDocuments({ booking_type: "Booked", is_completed: 1 }),
    ]);

    const daysArray = getLastNDates(days);

    const [
      userTrend,
      bookingTrend,
      packageRevenueTrend,
      serviceRevenueTrend,
      packageCityCounts,
      serviceCityCounts,
    ] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: today } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: today } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: "$type",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
      Package.aggregate([
        { $match: { booking_type: "Booked", createdAt: { $gte: startDate, $lte: today } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            value: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      DeliveryService.aggregate([
        { $match: { booking_type: "Booked", createdAt: { $gte: startDate, $lte: today } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            value: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Package.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: today } },
        },
        {
          $group: {
            _id: "$pickup_location",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      DeliveryService.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: today } },
        },
        {
          $group: {
            _id: "$start_location",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const bookingTrendMap = bookingTrend.reduce((acc, item) => {
      const date = item._id.date;
      const type = item._id.type;
      const existing = acc[date] || { date, totalBookings: 0, packageBookings: 0, serviceBookings: 0 };
      existing.totalBookings += item.count;
      if (type === 0) existing.packageBookings += item.count;
      if (type === 1) existing.serviceBookings += item.count;
      acc[date] = existing;
      return acc;
    }, {});

    const bookingTrendSeries = daysArray.map((date) => ({
      date,
      totalBookings: bookingTrendMap[date]?.totalBookings || 0,
      packageBookings: bookingTrendMap[date]?.packageBookings || 0,
      serviceBookings: bookingTrendMap[date]?.serviceBookings || 0,
    }));

    const packageRevenueSeries = mergeCountMap(daysArray, packageRevenueTrend, "value").map((entry) => ({
      date: entry.date,
      packageRevenue: entry.value,
    }));
    const serviceRevenueSeries = mergeCountMap(daysArray, serviceRevenueTrend, "value").map((entry) => ({
      date: entry.date,
      serviceRevenue: entry.value,
    }));

    const revenueSeries = daysArray.map((date) => {
      const packageRevenue = packageRevenueSeries.find((item) => item.date === date)?.packageRevenue || 0;
      const serviceRevenue = serviceRevenueSeries.find((item) => item.date === date)?.serviceRevenue || 0;
      return {
        date,
        packageRevenue,
        serviceRevenue,
        totalRevenue: packageRevenue + serviceRevenue,
      };
    });

    const topCities = [];
    const cityMap = new Map();
    [...packageCityCounts, ...serviceCityCounts].forEach((record) => {
      const city = record._id || "Unknown";
      const count = record.count || 0;
      cityMap.set(city, (cityMap.get(city) || 0) + count);
    });
    Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([city, count]) => topCities.push({ city, count }));

    const totalBookedItems = bookedPackages + bookedServices;
    const totalCompletedItems = completedPackages + completedServices;
    const completionRate = totalBookedItems ? Math.round((totalCompletedItems / totalBookedItems) * 100) : 0;

    const packageRevenueTotal = packageRevenueTrend.reduce((sum, item) => sum + (item.value || 0), 0);
    const serviceRevenueTotal = serviceRevenueTrend.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalRevenue = packageRevenueTotal + serviceRevenueTotal;
    const averageOrderValue = totalBookedItems ? Number((totalRevenue / totalBookedItems).toFixed(2)) : 0;

    const pieBookingStatus = [
      { name: "Booked", value: bookedPackages + bookedServices },
      { name: "Available", value: availablePackages + availableServices },
      { name: "Cancelled", value: cancelledPackages + cancelledServices },
    ];

    const verificationStatus = [
      { name: "Verified", value: totalVerifiedUsers },
      { name: "Pending", value: await User.countDocuments({ is_verified_user: 0 }) },
      { name: "Rejected", value: await User.countDocuments({ is_verified_user: 2 }) },
    ];

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          activeUsers,
          blockedUsers,
          totalVerifiedUsers,
          pendingVerifications,
          totalPackages,
          totalDeliveryServices,
          totalBookings,
          bookedPackages,
          bookedServices,
          availablePackages,
          availableServices,
          cancelledPackages,
          cancelledServices,
          completionRate,
          averageOrderValue,
          totalRevenue,
        },
        charts: {
          userGrowth: mergeCountMap(daysArray, userTrend, "count"),
          bookingTrend: bookingTrendSeries,
          revenueTrend: revenueSeries,
          bookingStatusPie: pieBookingStatus,
          verificationStatus,
          topCities,
        },
      },
    });
  } catch (err) {
    console.error("getAdminDashboardKPIs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminDashboardEnterprise = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 90);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentMonthStart);
    previousMonthEnd.setMilliseconds(-1);

    const [
      monthlyNewUsers,
      previousMonthlyNewUsers,
      currentMonthBookings,
      currentMonthBookedPackages,
      currentMonthBookedServices,
      currentMonthRevenue,
      yesterdayNewUsers,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: currentMonthStart } }),
      User.countDocuments({ createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } }),
      Booking.countDocuments({ createdAt: { $gte: currentMonthStart } }),
      Package.countDocuments({ booking_type: "Booked", updatedAt: { $gte: currentMonthStart } }),
      DeliveryService.countDocuments({ booking_type: "Booked", updatedAt: { $gte: currentMonthStart } }),
      Promise.all([
        Package.aggregate([
          { $match: { booking_type: "Booked", updatedAt: { $gte: currentMonthStart } } },
          { $group: { _id: null, total: { $sum: "$price" } } },
        ]),
        DeliveryService.aggregate([
          { $match: { booking_type: "Booked", updatedAt: { $gte: currentMonthStart } } },
          { $group: { _id: null, total: { $sum: "$price" } } },
        ]),
      ]),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(now.getDate() - 1)), $lte: now } }),
    ]);

    const [packageRevenueTotal, serviceRevenueTotal] = currentMonthRevenue;
    const monthRevenue = (packageRevenueTotal[0]?.total || 0) + (serviceRevenueTotal[0]?.total || 0);
    const monthlyGrowth = previousMonthlyNewUsers
      ? Number((((monthlyNewUsers - previousMonthlyNewUsers) / previousMonthlyNewUsers) * 100).toFixed(2))
      : 0;

    const dailyAverageBookings = days ? Number((currentMonthBookings / days).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        enterpriseSummary: {
          monthlyNewUsers,
          monthlyGrowth,
          currentMonthBookings,
          currentMonthRevenue: monthRevenue,
          dailyAverageBookings,
          yesterdayNewUsers,
          totalUsers: await User.countDocuments({}),
          totalActiveUsers: await User.countDocuments({ is_blocked: 0 }),
          totalBookedItems: await Booking.countDocuments({ booking_type: "Booked" }),
          totalRevenue: monthRevenue,
        },
        settings: {
          windowDays: days,
          generatedAt: now.toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("getAdminDashboardEnterprise error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    // Allowed fields to update
    const allowed = [
      "first_name",
      "last_name",
      "phone_number",
      "email",
      "pincode",
      "city",
      "state",
      "address",
      "aadhar_number",
      "pan_number",
      "is_valid_adhar",
      "is_valid_pan",
      "is_blocked",
    ];

    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        user[key] = req.body[key];
      }
    });

    // Handle uploaded files (if any)
    if (req.files) {
      const files = req.files;

      if (files.profile_image && files.profile_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "profile_images"), user.profile_image);
        user.profile_image = files.profile_image[0].filename;
      }

      if (files.pan_image && files.pan_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "pan_images"), user.pan_image);
        user.pan_image = files.pan_image[0].filename;
      }

      if (files.aadhar_front_image && files.aadhar_front_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "aadhar_images", "front"), user.aadhar_front_image);
        user.aadhar_front_image = files.aadhar_front_image[0].filename;
      }

      if (files.aadhar_back_image && files.aadhar_back_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "aadhar_images", "back"), user.aadhar_back_image);
        user.aadhar_back_image = files.aadhar_back_image[0].filename;
      }
    }

    await user.save();

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userObj = user.toObject();

    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    }
    if (userObj.pan_image) {
      userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
    }
    if (userObj.aadhar_front_image) {
      userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
    }
    if (userObj.aadhar_back_image) {
      userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
    }

    return res.status(200).json({ status: true, message: "User updated successfully", data: userObj });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ status: false, message: "Server Error", error: error.message });
  }
};
export const verifyUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_verified_user } = req.body;

    // ✅ Validate input
    if (![0, 1, 2].includes(is_verified_user)) {
      return res.status(400).json({
        status: false,
        message: "Invalid value. Use 0 (pending), 1 (verified), 2 (rejected)",
      });
    }

    // ✅ Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // ✅ Update only verification status
    user.is_verified_user = is_verified_user;

    await user.save();

    return res.status(200).json({
      status: true,
      message:
        is_verified_user === 1
          ? "User verified successfully"
          : is_verified_user === 2
          ? "User rejected"
          : "User set to pending",
      data: {
        id: user._id,
        is_verified_user: user.is_verified_user,
      },
    });
  } catch (error) {
    console.error("verifyUser error:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
};