import React, { useEffect, useState } from "react";
import api, {
  getAdminStats,
  getAdminProducts,
  getAdminOrders,
  getAdminCustomers,
  addProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
  updateProductStock,
  uploadProductImage
} from "../services/api";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [section, setSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sale_price: "",
  image_url: "",
  category: "",
  is_featured: false
};
  const [form, setForm] = useState(emptyProduct);
  const handleChange = (e) => {
  const { name, value, type, checked } = e.target;

  setForm((previous) => ({
    ...previous,
    [name]: type === "checkbox" ? checked : value
  }));
};

  async function loadDashboard() {
    try {
      const { data } = await api.get("/auth/me");

      if (data.user.role !== "admin") {
        throw new Error("Administrator access required.");
      }

      setUser(data.user);

      const [statistics, productList, orderList, customerList] =
  await Promise.all([
    getAdminStats(),
    getAdminProducts(),
    getAdminOrders(),
    getAdminCustomers()
  ]);

setStats(statistics);
setProducts(productList);
setOrders(orderList);
setCustomers(customerList);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function changeForm(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  function handleImageChange(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image size must be less than 5 MB.");
    return;
  }

  setSelectedImage(file);
  setImagePreview(URL.createObjectURL(file));
}

  async function saveProduct(event) {
  event.preventDefault();

  try {
    setUploading(true);

    let imageUrl = form.image_url;

    // Upload selected image to Cloudinary
    if (selectedImage) {
      const uploaded = await uploadProductImage(selectedImage);
      imageUrl = uploaded.url;
    }

    const product = {
      ...form,
      price: Number(form.price),
      image_url: imageUrl
    };

    if (editing) {
      await updateProduct(editing, product);
      alert("Product updated successfully.");
    } else {
      await addProduct(product);
      alert("Product added successfully.");
    }

    setForm(emptyProduct);
    setEditing(null);
    setSelectedImage(null);
    setImagePreview("");

    await loadDashboard();

  } catch (err) {
    alert(
      err.response?.data?.error ||
      "Could not save product."
    );
  } finally {
    setUploading(false);
  }
}

  function editProduct(product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      image_url: product.image_url || "",
      category: product.category,
      is_featured: Boolean(product.is_featured),
      sale_price: product.sale_price ?? ""
    });

    setSection("products");
    window.scrollTo(0, 0);
  }

  async function removeProduct(id) {
    if (!window.confirm("Delete this product?")) return;

    try {
      await deleteProduct(id);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.error || "Could not delete product.");
    }
  }

  async function changeStatus(id, status) {
    try {
      await updateOrderStatus(id, status);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.error || "Could not update order.");
    }
  }

  async function changeStock(product) {
  const value = window.prompt(
    `Enter new stock quantity for ${product.name}:`,
    product.stock_quantity
  );

  if (value === null) return;

  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    alert("Enter a valid stock quantity.");
    return;
  }

  try {
    await updateProductStock(product.id, quantity);
    await loadDashboard();
    alert("Inventory updated successfully.");
  } catch (err) {
    alert(err.response?.data?.error || "Could not update inventory.");
  }
}

  function logout() {
    localStorage.removeItem("noir_token");
    window.location.href = "/";
  }

  if (loading) {
    return <div className="admin-loading">Loading NOIR Admin...</div>;
  }

  if (error || !user) {
    return (
      <div className="admin-loading">
        <h2>Access unavailable</h2>
        <p>{error || "Please sign in with your administrator account."}</p>
        <button onClick={() => window.location.href = "/"}>
          Return to NOIR
        </button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h1>NOIR<span>.</span></h1>
        <p className="admin-label">ADMINISTRATION</p>

        {["overview", "products", "orders", "customers", "inventory"].map(item => (
          <button
            key={item}
            className={section === item ? "active" : ""}
            onClick={() => {
              setSection(item);
              setEditing(null);
              setForm(emptyProduct);
            }}
          >
            {item.toUpperCase()}
          </button>
        ))}

        <div className="admin-sidebar-bottom">
          <p>{user.name}</p>
          <button onClick={logout}>SIGN OUT</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span>NOIR / CONTROL CENTER</span>
            <h2>
              {section === "overview"
                ? "Dashboard"
                : section === "products"
                ? "Product Management"
                : "Order Management"}
            </h2>
          </div>
          <span className="admin-badge">ADMINISTRATOR</span>
        </header>

        {section === "overview" && (
          <>
            <div className="admin-stats">
              {[
                ["TOTAL REVENUE", `₹${Number(stats.total_revenue || 0).toLocaleString("en-IN")}`],
                ["TOTAL ORDERS", stats.total_orders],
                ["TOTAL PRODUCTS", stats.total_products],
                ["CUSTOMERS", stats.total_customers]
              ].map(([label, value]) => (
                <div className="admin-stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value ?? 0}</strong>
                </div>
              ))}
            </div>

            <section className="admin-panel">
              <h3>Recent Orders</h3>
              <OrderTable
                orders={orders.slice(0, 8)}
                onStatus={changeStatus}
              />
            </section>
          </>
        )}

        {section === "products" && (
          <div className="admin-panel">
            <h3>{editing ? "Edit Product" : "Add New Product"}</h3>

            <form className="admin-form" onSubmit={saveProduct}>
              <input name="name" placeholder="Product name"
                value={form.name} onChange={changeForm} required />

              <input name="slug" placeholder="Product slug"
                value={form.slug} onChange={changeForm} required />

              <input name="category" placeholder="Category"
                value={form.category} onChange={changeForm} required />

              <input name="price" type="number" min="0" step="0.01"
                placeholder="Price in INR"
                value={form.price} onChange={changeForm} required />

              <label>
                SALE PRICE (OPTIONAL)
                <input
                  name="sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, sale_price: e.target.value })
                  }
                  placeholder="Leave empty for no discount"
                />
              </label>

              <label className="image-upload-label">
              PRODUCT IMAGE

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Product preview" />
              </div>
            )}

            {!imagePreview && form.image_url && (
              <div className="image-preview">
                <img src={form.image_url} alt="Current product" />
              </div>
            )}

              <textarea name="description" placeholder="Description"
                value={form.description} onChange={changeForm} />

              <label className="featured-checkbox">
              <input
                type="checkbox"
                name="is_featured"
                checked={Boolean(form.is_featured)}
                onChange={event =>
                  setForm({
                    ...form,
                    is_featured: event.target.checked
                  })
                }
              />
              FEATURE THIS PRODUCT ON HOMEPAGE ⭐
            </label>  

              <button type="submit" disabled={uploading}>
                {uploading
                  ? "UPLOADING IMAGE..."
                  : editing
                  ? "SAVE CHANGES"
                  : "ADD PRODUCT"}
              </button>

              {editing && (
                <button type="button" onClick={() => {
                  setEditing(null);
                  setForm(emptyProduct);
                }}>
                  CANCEL EDIT
                </button>
              )}
            </form>

            <h3>Existing Products ({products.length})</h3>

            <div className="admin-product-list">
              {products.map(product => (
                <div className="admin-product" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category} · ₹{product.price}</span>
                  </div>

                  <div className="admin-actions">
                    <button onClick={() => editProduct(product)}>
                      EDIT
                    </button>
                    <button className="danger"
                      onClick={() => removeProduct(product.id)}>
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "orders" && (
          <section className="admin-panel">
            <h3>All Orders ({orders.length})</h3>
            <OrderTable orders={orders} onStatus={changeStatus} />
          </section>
        )}

        {section === "customers" && (
  <section className="admin-panel">
    <h3>Customer Management ({customers.length})</h3>

    <input
      placeholder="Search customers by name or email..."
      value={customerSearch}
      onChange={e => setCustomerSearch(e.target.value)}
    />

    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>JOINED</th>
            <th>ORDERS</th>
            <th>SPENDING</th>
          </tr>
        </thead>

        <tbody>
          {customers
            .filter(customer =>
              `${customer.name} ${customer.email}`
                .toLowerCase()
                .includes(customerSearch.toLowerCase())
            )
            .map(customer => (
              <tr key={customer.id}>
                <td>{customer.id}</td>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>
                  {new Date(customer.created_at).toLocaleDateString()}
                </td>
                <td>{customer.total_orders}</td>
                <td>
                  ₹{Number(customer.total_spent).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}

          {customers.length === 0 && (
            <tr>
              <td colSpan="6">No customers registered yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)} 

{section === "inventory" && (
  <section className="admin-panel">
    <h3>Inventory Management</h3>

    <div className="admin-stats">
      <div className="admin-stat-card">
        <span>TOTAL STOCK UNITS</span>
        <strong>
          {products.reduce(
            (sum, product) => sum + Number(product.stock_quantity || 0),
            0
          )}
        </strong>
      </div>

      <div className="admin-stat-card">
        <span>LOW STOCK</span>
        <strong>
          {products.filter(
            p => Number(p.stock_quantity) <= Number(p.low_stock_threshold)
              && Number(p.stock_quantity) > 0
          ).length}
        </strong>
      </div>

      <div className="admin-stat-card">
        <span>OUT OF STOCK</span>
        <strong>
          {products.filter(p => Number(p.stock_quantity) === 0).length}
        </strong>
      </div>
    </div>

    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>PRODUCT</th>
            <th>CATEGORY</th>
            <th>PRICE</th>
            <th>STOCK</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {products.map(product => {
            const stock = Number(product.stock_quantity || 0);
            const threshold = Number(product.low_stock_threshold || 10);

            return (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>₹{Number(product.price).toLocaleString("en-IN")}</td>
                <td>{stock}</td>

                <td>
                  {stock === 0
                    ? "OUT OF STOCK"
                    : stock <= threshold
                    ? "LOW STOCK"
                    : "IN STOCK"}
                </td>

                <td>
                  <button onClick={() => changeStock(product)}>
                    UPDATE STOCK
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
)}
      </main>
    </div>
  );
}

function OrderTable({ orders, onStatus }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ORDER</th>
            <th>CUSTOMER</th>
            <th>TOTAL</th>
            <th>STATUS</th>
            <th>UPDATE</th>
          </tr>
        </thead>

        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customer_name || `Customer ${order.user_id}`}</td>
              <td>₹{Number(order.total).toLocaleString("en-IN")}</td>
              <td>{order.status}</td>
              <td>
                <select
                  value={order.status}
                  onChange={event =>
                    onStatus(order.id, event.target.value)
                  }
                >
                  {["placed", "confirmed", "shipped", "delivered", "cancelled"]
                    .map(status => (
                      <option key={status} value={status}>
                        {status.toUpperCase()}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}

          {orders.length === 0 && (
            <tr><td colSpan="5">No orders found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}