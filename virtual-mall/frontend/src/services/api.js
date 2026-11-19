import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api", timeout: 12000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("noir_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export async function getProducts() { const { data } = await api.get("/products"); return data; }
export async function signIn(email,password) { const { data } = await api.post("/auth/login",{email,password}); return data; }
export async function signUp(name,email,password) { const { data } = await api.post("/auth/register",{name,email,password}); return data; }
export async function createOrder(items,shipping) { const { data } = await api.post("/orders",{items,shipping}); return data; }
export async function getOrders() { const { data } = await api.get("/orders"); return data; }
export async function updateProductStock(id, stock_quantity) {
  const { data } = await api.patch(
    `/admin/products/${id}/stock`,
    { stock_quantity }
  );
  return data;
}
export async function getAdminCustomers() {
  const { data } = await api.get("/admin/customers");
  return data;
}

export async function getAdminStats() {
  const { data } = await api.get("/admin/stats");
  return data;
}

export async function getAdminProducts() {
  const { data } = await api.get("/admin/products");
  return data;
}

export async function getAdminOrders() {
  const { data } = await api.get("/admin/orders");
  return data;
}

export async function addProduct(product) {
  const { data } = await api.post("/admin/products", product);
  return data;
}

export async function updateProduct(id, product) {
  const { data } = await api.put(`/admin/products/${id}`, product);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/admin/products/${id}`);
  return data;
}

export async function updateOrderStatus(id, status) {
  const { data } = await api.patch(`/admin/orders/${id}/status`, {
    status
  });
  return data;
}

export async function cancelOrder(id) {
  const { data } = await api.patch(`/orders/${id}/cancel`);
  return data;
}


// GET ALL REVIEWS FOR A PRODUCT
export async function getProductReviews(productId) {
  const { data } = await api.get(`/reviews/product/${productId}`);
  return data;
}

// GET PRODUCT RATING SUMMARY
export async function getReviewSummary(productId) {
  const { data } = await api.get(`/reviews/product/${productId}/summary`);
  return data;
}

// SUBMIT PRODUCT REVIEW
export async function submitProductReview(review) {
  const { data } = await api.post("/reviews", review);
  return data;
}

// UPDATE YOUR REVIEW
export async function updateProductReview(id, review) {
  const { data } = await api.put(`/reviews/${id}`, review);
  return data;
}

// DELETE YOUR REVIEW
export async function deleteProductReview(id) {
  const { data } = await api.delete(`/reviews/${id}`);
  return data;
}

export default api;

// CUSTOMER ADDRESS MANAGEMENT

export async function getAddresses() {
  const { data } = await api.get("/addresses");
  return data;
}

export async function addAddress(address) {
  const { data } = await api.post("/addresses", address);
  return data;
}

export async function updateAddress(id, address) {
  const { data } = await api.put(`/addresses/${id}`, address);
  return data;
}

export async function deleteAddress(id) {
  const { data } = await api.delete(`/addresses/${id}`);
  return data;
}

export async function setDefaultAddress(id) {
  const { data } = await api.patch(`/addresses/${id}/default`);
  return data;
}

// ORDER TRACKING

export async function getOrderTracking(orderId) {
  const { data } = await api.get(`/orders/${orderId}/tracking`);
  return data;
}

// Customer notifications
export async function getNotifications() {
  const { data } = await api.get("/notifications");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await api.post("/uploads", formData);

  return data;
}