import React, { useEffect, useMemo, useState } from "react";
import MallScene from "../components/MallScene.jsx";
import ProductCard from "../components/ProductCard.jsx";
import {
  getProducts,
  signIn,
  signUp,
  createOrder,
  getOrders,
  cancelOrder,
  getReviewSummary,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getOrderTracking,
  getNotifications,
  markNotificationRead
} from "../services/api.js";

const categories = ["Sneakers","Men's Fashion","Women's Fashion","Watches","Eyewear","Luxury Bags","Jewellery","Streetwear","Sportswear","Denim","Beauty","Accessories","Electronics","Home Decor","New Arrivals"];
const demoCatalog = [
  ["Aero Runner","Sculpted everyday sneaker.",7999], ["Courtline Low","Minimal leather court sneaker.",6499],
  ["Noir Tailored Shirt","Relaxed premium cotton tailoring.",4299], ["Atelier Overshirt","A versatile layered essential.",5999],
  ["Forma Evening Dress","A clean silhouette for after dark.",8999], ["Softline Knit Top","A refined everyday layer.",3499],
  ["Noir Chronograph","A considered steel timepiece.",12999], ["Meridian Automatic","Precision with a quiet profile.",18999],
  ["Mono Frame","Contemporary acetate eyewear.",3499], ["Sculpt Optical","Lightweight architectural frames.",2999],
  ["Studio Carryall","A structured daily essential.",5999], ["Arc Mini Bag","Compact form, considered detail.",7499],
  ["Lumen Pendant","A polished everyday keepsake.",2499], ["Contour Cuff","Sculptural metal finish.",3199],
  ["District Graphic Tee","A bold essential in soft cotton.",1999], ["Utility Cargo","A modern streetwear staple.",4599],
  ["Motion Training Set","Designed for everyday movement.",4999], ["Tempo Performance Tee","Lightweight active comfort.",1799],
  ["Raw Edge Denim","A straight fit with clean lines.",3999], ["Washed Wide Jean","Relaxed shape, deep indigo.",4499],
  ["Noir Skin Set","A simple daily-care ritual.",2799], ["Glow Serum","A lightweight skin essential.",1899],
  ["Everyday Belt","A refined finishing detail.",2299], ["Forma Sunglasses","A distinctive finishing touch.",3299],
  ["Studio Headphones","Immersive sound, minimal form.",8999], ["Arc Wireless Speaker","Compact sound for any space.",6999],
  ["Form Table Lamp","Warm light, sculptural profile.",5499], ["Softform Cushion","Texture for considered spaces.",1499],
  ["The New Edit Jacket","A fresh statement layer.",9999], ["Limited Edition Tote","A collectible daily carry.",3999]
];
const demoProducts = categories.flatMap((category, i) => [0,1].map(j => {
  const item = demoCatalog[i*2+j];
  return { id: `demo-${i}-${j}`, slug:item[0].toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""), name:item[0], description:item[1], price:item[2], category, image_url:"" };
}));

export default function Home() {
  const [products,setProducts] = useState(demoProducts);
  const [cart,setCart] = useState(()=>{ try{return JSON.parse(localStorage.getItem("noir_cart")||"[]");}catch{return [];} });
  const [activeCategory,setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ratingMap, setRatingMap] = useState({});
  const [cartOpen,setCartOpen] = useState(false);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState("login");
  const [user,setUser] = useState(()=>{try{return JSON.parse(localStorage.getItem("noir_user")||"null");}catch{return null;}});
  const [authForm,setAuthForm] = useState({name:"",email:"",password:""});
  const [checkoutOpen,setCheckoutOpen] = useState(false);
  const [shipping,setShipping] = useState({fullName:"",phone:"",address:"",city:"",state:"",postalCode:""});
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [orders,setOrders] = useState([]);
  const [ordersOpen,setOrdersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    isDefault: false
  });

const [editingAddress, setEditingAddress] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("noir_wishlist") || "[]");
  } catch {
    return [];
  }
});

const [wishlistOpen, setWishlistOpen] = useState(false);
  useEffect(()=>{ getProducts().then(rows=>{ if(Array.isArray(rows) && rows.length) setProducts(rows); }).catch(()=>{}); },[]);
  useEffect(() => {
  if (!products.length) return;

  let active = true;

  Promise.all(
    products.filter(product => /^\d+$/.test(String(product.id)))
      .map(async product => {
        try {
          const summary = await getReviewSummary(product.id);
          return [product.id, Number(summary.average_rating || 0)];
        } catch {
          return [product.id, 0];
        }
      })
  ).then(results => {
    if (active) {
      setRatingMap(Object.fromEntries(results));
    }
  });

  return () => {
    active = false;
  };
}, [products]);
  useEffect(()=>{localStorage.setItem("noir_cart",JSON.stringify(cart));},[cart]);
  useEffect(() => {
  const syncWishlist = () => {
    try {
      setWishlist(
        JSON.parse(localStorage.getItem("noir_wishlist") || "[]")
      );
    } catch {
      setWishlist([]);
    }
  };

  window.addEventListener("noir-wishlist-updated", syncWishlist);
  window.addEventListener("storage", syncWishlist);

  return () => {
    window.removeEventListener("noir-wishlist-updated", syncWishlist);
    window.removeEventListener("storage", syncWishlist);
  };
}, []);
const visibleProducts = useMemo(() => {
  let result = [...products];

  // Department filter
  if (activeCategory) {
    result = result.filter(
      p => (p.category || "").toLowerCase() === activeCategory.toLowerCase()
    );
  }

  // Search using complete words
if (searchQuery.trim()) {
  const query = searchQuery.trim().toLowerCase();

  result = result.filter(p => {
    const searchableText = `${p.name || ""} ${p.category || ""}`
      .toLowerCase();

    const words = searchableText.match(/[a-z0-9]+/g) || [];

    return words.some(word => word === query);
  });
}
  // Minimum price
  if (minPrice !== "") {
    result = result.filter(p => Number(p.price) >= Number(minPrice));
  }

  // Maximum price
  if (maxPrice !== "") {
    result = result.filter(p => Number(p.price) <= Number(maxPrice));
  }

  // Sorting
  if (sortBy === "price-low") {
    result.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === "price-high") {
    result.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "rating") {
    result.sort(
      (a, b) =>
        (ratingMap[b.id] || 0) - (ratingMap[a.id] || 0)
    );
  }

  return result;
}, [
  products,
  activeCategory,
  searchQuery,
  minPrice,
  maxPrice,
  sortBy,
  ratingMap
]);
  const addToCart = product => setCart(current=>{const key=String(product.id);const found=current.find(p=>String(p.id)===key);return found?current.map(p=>String(p.id)===key?{...p,quantity:Math.min(20,(p.quantity||1)+1)}:p):[...current,{...product,quantity:1}];});
  const changeQty = (id,delta) => setCart(current=>current.map(p=>String(p.id)===String(id)?{...p,quantity:(p.quantity||1)+delta}:p).filter(p=>p.quantity>0));
  const cartCount = cart.reduce((n,p)=>n+(p.quantity||1),0);
  const getEffectivePrice = (product) => {
  const regular = Number(product.price);
  const sale = Number(product.sale_price);

  return sale > 0 && sale < regular ? sale : regular;
};

const cartTotal = cart.reduce(
  (total, product) =>
    total + getEffectivePrice(product) * (product.quantity || 1),
  0
);
  const openDepartment = category => { setActiveCategory(category); if(category) setTimeout(()=>document.getElementById("products")?.scrollIntoView({behavior:"smooth",block:"start"}),180); };
  const acceptAuth = data => {localStorage.setItem("noir_token",data.token);localStorage.setItem("noir_user",JSON.stringify(data.user));setUser(data.user);setAuthOpen(false);setNotice(`Welcome, ${data.user.name}.`);};
  const submitAuth = async e => {e.preventDefault();setBusy(true);setNotice("");try{const data=authMode==="register"?await signUp(authForm.name,authForm.email,authForm.password):await signIn(authForm.email,authForm.password);acceptAuth(data);}catch(err){setNotice(err.response?.data?.error||"Could not connect to the NOIR server.");}finally{setBusy(false);}};
  const submitOrder = async e => {e.preventDefault();setBusy(true);setNotice("");try{const result=await createOrder(cart.map(p=>({productId:Number(p.id),quantity:p.quantity||1})),shipping);setCart([]);setCheckoutOpen(false);setCartOpen(false);setNotice(`Order #${result.order.id} placed successfully. Payment is not collected in this Stage 3 checkout.`);}catch(err){setNotice(err.response?.data?.error||"Could not place your order. Check that the database migration has been run.");}finally{setBusy(false);}};
  const showOrders = async()=>{if(!user){setAuthOpen(true);return;}setBusy(true);try{setOrders(await getOrders());setOrdersOpen(true);}catch(err){setNotice(err.response?.data?.error||"Unable to load order history.");}finally{setBusy(false);}};
  const showTracking = async (orderId) => {
  setTrackingBusy(true);
  setTrackingData(null);
  setTrackingOpen(true);

  try {
    const data = await getOrderTracking(orderId);
    setTrackingData(data);
  } catch (error) {
    setNotice(
      error.response?.data?.error || "Unable to load order tracking."
    );
  } finally {
    setTrackingBusy(false);
  }
};
  const showProfile = async () => {
  if (!user) {
    setAuthOpen(true);
    return;
  }

  setBusy(true);

  try {
    setAddresses(await getAddresses());

    setAddressForm({
      fullName: user.name || "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      isDefault: false
    });

    setEditingAddress(null);
    setProfileOpen(true);
  } catch (error) {
    setNotice(
      error.response?.data?.error || "Unable to load your addresses."
    );
  } finally {
    setBusy(false);
  }
};

const saveAddress = async (event) => {
  event.preventDefault();
  setBusy(true);

  try {
    if (editingAddress) {
      await updateAddress(editingAddress.id, addressForm);
      setNotice("Address updated successfully.");
    } else {
      await addAddress(addressForm);
      setNotice("Address saved successfully.");
    }

    setAddresses(await getAddresses());

    setAddressForm({
      fullName: user.name || "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      isDefault: false
    });

    setEditingAddress(null);
  } catch (error) {
    setNotice(error.response?.data?.error || "Unable to save address.");
  } finally {
    setBusy(false);
  }
};

const loadNotifications = async () => {
  try {
    const data = await getNotifications();
    setNotifications(data);
    setUnreadCount(data.filter(item => !item.is_read).length);
  } catch (error) {
    console.error("Unable to load notifications:", error);
  }
};

const openNotifications = async () => {
  await loadNotifications();
  setNotificationsOpen(true);
};

const handleMarkRead = async (id) => {
  try {
    await markNotificationRead(id);
    await loadNotifications();
  } catch (error) {
    setNotice("Unable to update notification.");
  }
};

const removeAddress = async (id) => {
  if (!window.confirm("Delete this saved address?")) return;

  try {
    await deleteAddress(id);
    setAddresses(await getAddresses());
    setNotice("Address deleted successfully.");
  } catch (error) {
    setNotice(error.response?.data?.error || "Unable to delete address.");
  }
};

const makeDefaultAddress = async (id) => {
  try {
    await setDefaultAddress(id);
    setAddresses(await getAddresses());
    setNotice("Default address updated.");
  } catch (error) {
    setNotice(error.response?.data?.error || "Unable to update default address.");
  }
};
  const signOut = ()=>{localStorage.removeItem("noir_token");localStorage.removeItem("noir_user");setUser(null);setNotice("You have signed out.");};
  
  const handleCancelOrder = async (orderId) => {
  const confirmed = window.confirm(
    `Are you sure you want to cancel Order #${orderId}?`
  );

  if (!confirmed) return;

  setBusy(true);

  try {
    await cancelOrder(orderId);
    setOrders(await getOrders());
    setNotice(`Order #${orderId} cancelled successfully. Stock restored.`);
  } catch (err) {
    setNotice(
      err.response?.data?.error || "Could not cancel this order."
    );
  } finally {
    setBusy(false);
  }
};

  return <main>
    <header className="topbar">
      <a className="wordmark" href="#top">NOIR<span>.</span></a>
      <nav><a href="#experience">Experience</a><a href="#categories">Departments</a><a href="#products">Objects</a></nav>
      <div className="account-actions">{user?<><button className="cart-link" onClick={showOrders}>ORDERS</button><button className="cart-link" onClick={showProfile}>
  MY PROFILE
</button><button className="cart-link" onClick={signOut}>SIGN OUT</button></>:<button className="cart-link" onClick={()=>{setAuthMode("login");setAuthOpen(true);}}>SIGN IN</button>}<button className="cart-link" onClick={()=>setCartOpen(v=>!v)}>BAG ({cartCount})</button><button
  className="cart-link"
  onClick={() => setWishlistOpen(true)}
>
  ♥ WISHLIST ({wishlist.length})
</button><button
  className="notification-button"
  onClick={openNotifications}
>
  🔔 NOTIFICATIONS ({unreadCount})
</button></div>
    </header>
    {notice && <div className="noir-toast" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {wishlistOpen && (
  <div className="modal-backdrop">
    <section className="noir-modal wishlist-modal">
      <button
        className="modal-x"
        onClick={() => setWishlistOpen(false)}
      >
        ×
      </button>

      <p className="eyebrow">YOUR SAVED COLLECTION</p>
      <h2>My Wishlist.</h2>

      {wishlist.length === 0 ? (
        <p>Your wishlist is empty. Save something you love.</p>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(product => (
            <article className="history-row" key={product.id}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="wishlist-image"
                />
              ) : null}

              <strong>{product.name}</strong>

              <p>
                ₹{Number(product.price).toLocaleString("en-IN")}
              </p>

              <button
                className="checkout-button"
                onClick={() => {
                  addToCart(product);
                  setNotice(`${product.name} added to your bag.`);
                }}
              >
                ADD TO BAG
              </button>

              <button
                className="wishlist-remove"
                onClick={() => {
                  const updated = wishlist.filter(
                    item => String(item.id) !== String(product.id)
                  );

                  localStorage.setItem(
                    "noir_wishlist",
                    JSON.stringify(updated)
                  );

                  setWishlist(updated);
                  window.dispatchEvent(
                    new Event("noir-wishlist-updated")
                  );
                }}
              >
                REMOVE ♥
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  </div>
)}
    {cartOpen && <aside className="cart-panel"><button className="cart-close" onClick={()=>setCartOpen(false)}>CLOSE ×</button><h3>Your bag · {cartCount} items</h3>{cart.length===0?<p>Your bag is waiting for its first find.</p>:<>{cart.map(p=><div className="cart-row" key={p.id}><span>{p.name}<small className="qty-controls"><button onClick={()=>changeQty(p.id,-1)}>−</button> {p.quantity||1} <button onClick={()=>changeQty(p.id,1)}>+</button></small></span><strong>₹{(Number(p.price)*(p.quantity||1)).toLocaleString("en-IN")}</strong></div>)}<div className="cart-total"><span>Subtotal</span><strong>₹{cartTotal.toLocaleString("en-IN")}</strong></div><button className="checkout-button" onClick={()=>{setCartOpen(false);if(!user){setAuthMode("login");setAuthOpen(true);setNotice("Sign in or create an account before checkout.");}else setCheckoutOpen(true);}}>CONTINUE TO CHECKOUT ↗</button></>}</aside>}
    {authOpen && <div className="modal-backdrop"><form className="noir-modal" onSubmit={submitAuth}><button type="button" className="modal-x" onClick={()=>setAuthOpen(false)}>×</button><p className="eyebrow">NOIR ACCOUNT</p><h2>{authMode==="login"?"Welcome back.":"Create your account."}</h2>{authMode==="register"&&<label>Full name<input required minLength="2" maxLength="100" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})}/></label>}<label>Email address<input type="email" required value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})}/></label><label>Password<input type="password" required minLength="8" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})}/></label><button className="checkout-button" disabled={busy}>{busy?"PLEASE WAIT…":authMode==="login"?"SIGN IN":"CREATE ACCOUNT"}</button><p className="modal-switch">{authMode==="login"?"New to NOIR?":"Already have an account?"} <button type="button" onClick={()=>setAuthMode(authMode==="login"?"register":"login")}>{authMode==="login"?"Create account":"Sign in"}</button></p></form></div>}
    {checkoutOpen && <div className="modal-backdrop"><form className="noir-modal checkout-modal" onSubmit={submitOrder}><button type="button" className="modal-x" onClick={()=>setCheckoutOpen(false)}>×</button><p className="eyebrow">SECURE CHECKOUT</p><h2>Delivery details.</h2><div className="checkout-fields">{[["fullName","Full name"],["phone","Phone number"],["address","Street address"],["city","City"],["state","State"],["postalCode","PIN code"]].map(([key,label])=><label key={key}>{label}<input required value={shipping[key]} onChange={e=>setShipping({...shipping,[key]:e.target.value})}/></label>)}</div><div className="cart-total"><span>Order total</span><strong>₹{cartTotal.toLocaleString("en-IN")}</strong></div><p className="checkout-note">Stage 3 places a COD/demo order. Online payment will be connected in the next stage.</p><button className="checkout-button" disabled={busy}>{busy?"PLACING ORDER…":"PLACE ORDER ↗"}</button></form></div>}
    {profileOpen && (
  <div className="modal-backdrop">
    <section className="noir-modal profile-modal">

      <button
        className="modal-x"
        onClick={() => setProfileOpen(false)}
      >
        ×
      </button>

      <p className="eyebrow">YOUR NOIR ACCOUNT</p>
      <h2>My Profile.</h2>

      <div className="profile-details">
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>

      <hr />

      <h3>Saved delivery addresses</h3>

      {addresses.length === 0 ? (
        <p>No saved addresses yet.</p>
      ) : (
        addresses.map(item => (
          <article className="history-row" key={item.id}>

            <strong>{item.full_name}</strong>

            {item.is_default && (
              <span className="default-address-label">
                DEFAULT ADDRESS
              </span>
            )}

            <p>{item.phone}</p>
            <p>{item.address}</p>
            <p>
              {item.city}, {item.state} - {item.postal_code}
            </p>

            <div className="profile-actions">

              <button
                onClick={() => {
                  setEditingAddress(item);

                  setAddressForm({
                    fullName: item.full_name,
                    phone: item.phone,
                    address: item.address,
                    city: item.city,
                    state: item.state,
                    postalCode: item.postal_code,
                    isDefault: item.is_default
                  });
                }}
              >
                EDIT
              </button>

              <button onClick={() => removeAddress(item.id)}>
                DELETE
              </button>

              {!item.is_default && (
                <button onClick={() => makeDefaultAddress(item.id)}>
                  SET DEFAULT
                </button>
              )}

            </div>
          </article>
        ))
      )}

      <hr />

      <h3>
        {editingAddress ? "Edit address" : "Add a new address"}
      </h3>

      <form onSubmit={saveAddress} className="address-form">

        {[
          ["fullName", "Full name"],
          ["phone", "Phone number"],
          ["address", "Street address"],
          ["city", "City"],
          ["state", "State"],
          ["postalCode", "PIN code"]
        ].map(([key, label]) => (
          <label key={key}>
            {label}

            <input
              required
              value={addressForm[key]}
              onChange={event =>
                setAddressForm({
                  ...addressForm,
                  [key]: event.target.value
                })
              }
            />
          </label>
        ))}

        <label className="default-address-check">
          <input
            type="checkbox"
            checked={addressForm.isDefault}
            onChange={event =>
              setAddressForm({
                ...addressForm,
                isDefault: event.target.checked
              })
            }
          />
          Set as default address
        </label>

        <button className="checkout-button" disabled={busy}>
          {busy
            ? "PLEASE WAIT..."
            : editingAddress
              ? "UPDATE ADDRESS"
              : "SAVE ADDRESS"}
        </button>

        {editingAddress && (
          <button
            type="button"
            onClick={() => {
              setEditingAddress(null);
              setAddressForm({
                fullName: user.name || "",
                phone: "",
                address: "",
                city: "",
                state: "",
                postalCode: "",
                isDefault: false
              });
            }}
          >
            CANCEL EDITING
          </button>
        )}

      </form>

    </section>
  </div>
)}
{notificationsOpen && (
  <div className="modal-backdrop">
    <section className="noir-modal">
      <button
        className="modal-x"
        onClick={() => setNotificationsOpen(false)}
      >
        ×
      </button>

      <p className="eyebrow">NOIR ACCOUNT</p>
      <h2>Notifications.</h2>

      {notifications.length === 0 ? (
        <p>You have no notifications yet.</p>
      ) : (
        notifications.map(item => (
          <article className="history-row" key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.message}</p>

            <small>
              {new Date(item.created_at).toLocaleString("en-IN")}
            </small>

            {!item.is_read && (
              <button
                className="checkout-button"
                onClick={() => handleMarkRead(item.id)}
              >
                MARK AS READ
              </button>
            )}

            {item.is_read && <small>✓ Read</small>}
          </article>
        ))
      )}
    </section>
  </div>
)}

    {ordersOpen && (
  <div className="modal-backdrop">
    <section className="noir-modal">
      <button
        className="modal-x"
        onClick={() => setOrdersOpen(false)}
      >
        ×
      </button>

      <p className="eyebrow">YOUR NOIR ACCOUNT</p>
      <h2>Order history.</h2>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map(order => (
          <article className="history-row" key={order.id}>
            <strong>Order #{order.id}</strong>

            <span>
              {order.status} · ₹
              {Number(order.total).toLocaleString("en-IN")}
            </span>
            <button
             className="checkout-button"
             onClick={() => showTracking(order.id)}
            >
              TRACK ORDER
            </button>

            <small>
              {new Date(order.created_at).toLocaleString()}
            </small>

            {(order.items || []).map((item, index) => (
              <small key={index}>
                {item.productName} × {item.quantity}
              </small>
            ))}

            {["placed", "confirmed"].includes(order.status) && (
              <button
                className="checkout-button"
                disabled={busy}
                onClick={() => handleCancelOrder(order.id)}
              >
                {busy ? "PLEASE WAIT..." : "CANCEL ORDER"}
              </button>
            )}
          </article>
        ))
      )}
    </section>
  </div>
)}
{trackingOpen && (
  <div className="modal-backdrop">
    <section className="noir-modal">
      <button
        className="modal-x"
        onClick={() => setTrackingOpen(false)}
      >
        ×
      </button>

      <p className="eyebrow">NOIR DELIVERY</p>
      <h2>Track your order.</h2>

      {trackingBusy ? (
        <p>Loading tracking details...</p>
      ) : trackingData ? (
        <>
          <p>
            <strong>Order #{trackingData.id}</strong>
          </p>

          <p>
            Status: <strong>{trackingData.status?.replaceAll("_", " ")}</strong>
          </p>

          {trackingData.tracking_number && (
            <p>Tracking number: {trackingData.tracking_number}</p>
          )}

          {trackingData.estimated_delivery && (
            <p>
              Estimated delivery:{" "}
              {new Date(trackingData.estimated_delivery).toLocaleDateString("en-IN")}
            </p>
          )}

          <h3>Order updates</h3>

          {trackingData.history?.length ? (
            trackingData.history.map((event, index) => (
              <article className="history-row" key={index}>
                <strong>{event.status.replaceAll("_", " ")}</strong>
                <small>{event.note}</small>
                <small>
                  {new Date(event.created_at).toLocaleString("en-IN")}
                </small>
              </article>
            ))
          ) : (
            <p>No tracking updates yet.</p>
          )}
        </>
      ) : (
        <p>Tracking information is unavailable.</p>
      )}
    </section>
  </div>
)}

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow">THE DIGITAL FLAGSHIP · EST. 2026</p><h1>Enter a new<br/><em>dimension</em> of style.</h1><p className="hero-description">A considered destination for objects, design and contemporary fashion. Explore the showroom in three dimensions.</p><a className="primary-button" href="#experience">ENTER THE MALL <span>↗</span></a></div>
      <div className="hero-side-note">A NEW WAY<br/>TO DISCOVER</div>
    </section>
    <section className="experience-section" id="experience">
      <div className="section-heading"><div><p className="eyebrow">01 / THE SHOWROOM</p><h2>Explore the space.</h2></div><p>Fifteen departments surround the central atrium.<br/>Click a display to enter its department.</p></div>
      <MallScene onDepartmentSelect={openDepartment}/>
    </section>
    <section className="category-section" id="categories">
      <p className="eyebrow">02 / DEPARTMENTS</p><h2>Fifteen worlds.<br/><em>One destination.</em></h2>
      <div className="category-grid">{categories.map((category,index)=><button className="category-link" onClick={()=>openDepartment(category)} key={category}><span>{String(index+1).padStart(2,"0")}</span>{category}<b>↗</b></button>)}</div>
    </section>
    {products.some(product => product.is_featured) && (
  <section className="products-section featured-section" id="featured">
    <div className="section-heading">
      <div>
        <p className="eyebrow">CURATED FOR YOU</p>
        <h2>Featured pieces.</h2>
      </div>
      <p>NOIR highlights</p>
    </div>

    <div className="product-grid">
      {products
        .filter(product => product.is_featured)
        .map((product, index) => (
          <ProductCard
            key={product.id ?? `featured-${index}`}
            product={product}
            onAdd={addToCart}
          />
        ))}
    </div>
  </section>
)}
    <section className="products-section" id="products">
      <div className="section-heading"><div><p className="eyebrow">03 / {activeCategory ? "THE DEPARTMENT STORE" : "CURATED OBJECTS"}</p><h2>{activeCategory || "Selected pieces."}</h2></div><p>{visibleProducts.length} pieces in this edit</p></div>
      {activeCategory && <div className="store-toolbar"><span>NOW EXPLORING / {activeCategory.toUpperCase()}</span><button onClick={()=>setActiveCategory(null)}>VIEW ALL OBJECTS ↗</button></div>}
      <div className="noir-product-filters">

  <input
    type="search"
    placeholder="Search products, brands or departments..."
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
  />

  <input
    type="number"
    min="0"
    placeholder="Minimum ₹"
    value={minPrice}
    onChange={e => setMinPrice(e.target.value)}
  />

  <input
    type="number"
    min="0"
    placeholder="Maximum ₹"
    value={maxPrice}
    onChange={e => setMaxPrice(e.target.value)}
  />

  <select
    value={sortBy}
    onChange={e => setSortBy(e.target.value)}
  >
    <option value="default">Default sorting</option>
    <option value="price-low">Price: Low to High</option>
    <option value="price-high">Price: High to Low</option>
    <option value="name">Name: A to Z</option>
    <option value="rating">Highest Rated</option>
  </select>

  <button
    onClick={() => {
      setSearchQuery("");
      setMinPrice("");
      setMaxPrice("");
      setSortBy("default");
      setActiveCategory(null);
    }}
  >
    CLEAR FILTERS
  </button>

</div>

<p className="filter-results">
  Showing {visibleProducts.length} products
</p>

{visibleProducts.length === 0 && (
  <p className="filter-results">
    No products found. Try changing your search or filters.
  </p>
)}
      <div className="product-grid">{visibleProducts.map((product,index)=><ProductCard key={product.id ?? `${product.name}-${index}`} product={product} onAdd={addToCart}/>)}</div>
    </section>
    <footer><a className="wordmark" href="#top">NOIR<span>.</span></a><p>THE FUTURE OF DISCOVERY.</p><span>© 2026 NOIR VIRTUAL MALL</span></footer>
  </main>;
}
