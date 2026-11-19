
import React, { useEffect, useState } from "react";
import {
  getProductReviews,
  getReviewSummary,
  getOrders,
  submitProductReview,
  updateProductReview,
  deleteProductReview
} from "../services/api.js";

export default function ProductCard({ product, onAdd }) {

    const [isWishlisted, setIsWishlisted] = useState(() => {
    const wishlist = JSON.parse(localStorage.getItem("noir_wishlist") || "[]");
    return wishlist.some(item => String(item.id) === String(product.id));
  });

  function toggleWishlist() {
    const wishlist = JSON.parse(localStorage.getItem("noir_wishlist") || "[]");

    const alreadySaved = wishlist.some(
  item => String(item.id) === String(product.id)
);

    const updatedWishlist = alreadySaved
      ? wishlist.filter(item => String(item.id) !== String(product.id))
      : [...wishlist, product];

    localStorage.setItem("noir_wishlist", JSON.stringify(updatedWishlist));
    setIsWishlisted(!alreadySaved);

    window.dispatchEvent(new Event("noir-wishlist-updated"));
  }
  const [summary, setSummary] = useState({
    average_rating: 0,
    total_reviews: 0
  });

  const [reviews, setReviews] = useState([]);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [editingReview, setEditingReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReviews() {
    try {
      const [reviewList, ratingSummary] = await Promise.all([
        getProductReviews(product.id),
        getReviewSummary(product.id)
      ]);

      setReviews(reviewList);
      setSummary(ratingSummary);
    } catch {
      setMessage("Unable to load reviews.");
    }
  }

    useEffect(() => {
    if (!/^\d+$/.test(String(product.id))) {
      setReviews([]);
      setSummary({
        average_rating: 0,
        total_reviews: 0
      });
      return;
    }

    loadReviews();
  }, [product.id]);

  async function openReviewForm() {
        if (!/^\d+$/.test(String(product.id))) {
      setMessage("Reviews are available for registered store products only.");
      return;
    }
    if (!localStorage.getItem("noir_token")) {
      setMessage("Please sign in before writing a review.");
      return;
    }

    setBusy(true);

    try {
      const customerOrders = await getOrders();

      const eligibleOrders = customerOrders.filter(order =>
        order.status !== "cancelled" &&
        (order.items || []).some(
          item => Number(item.productId) === Number(product.id)
        )
      );

      if (!eligibleOrders.length) {
        setMessage("You can review this product after purchasing it.");
        return;
      }

      setOrders(eligibleOrders);
      setSelectedOrder(String(eligibleOrders[0].id));
      setWriteOpen(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Unable to check your purchases."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveReview(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (editingReview) {
        await updateProductReview(editingReview.id, {
          rating,
          reviewText
        });
      } else {
        await submitProductReview({
          productId: product.id,
          orderId: Number(selectedOrder),
          rating,
          reviewText
        });
      }

      setReviewText("");
      setRating(5);
      setEditingReview(null);
      setWriteOpen(false);

      await loadReviews();
      setMessage("Your review was saved successfully.");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not save your review."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeReview(id) {
    if (!window.confirm("Delete your review?")) return;

    setBusy(true);

    try {
      await deleteProductReview(id);
      await loadReviews();
      setMessage("Review deleted successfully.");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not delete review."
      );
    } finally {
      setBusy(false);
    }
  }

  function editReview(review) {
    setEditingReview(review);
    setRating(review.rating);
    setReviewText(review.review_text);
    setWriteOpen(true);
    setReviewsOpen(false);
  }

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {product.sale_price &&
          Number(product.sale_price) > 0 &&
          Number(product.sale_price) < Number(product.price) && (
           <span className="sale-tag">SALE</span>
         )}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="image-placeholder">NOIR</div>
        )}

        <span className="product-category">{product.category}</span>
                <button
          type="button"
          className={`wishlist-heart ${isWishlisted ? "active" : ""}`}
          onClick={toggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          {isWishlisted ? "♥" : "♡"}
        </button>
      </div>

      <div className="product-info">
        <div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>

          <button
            className="review-link"
            onClick={() => {
              setReviewsOpen(true);
              loadReviews();
            }}
          >
            <span>★</span>{" "}
            {Number(summary.average_rating).toFixed(1)}
            {" "}({summary.total_reviews} reviews)
          </button>
        </div>
        </div>

        <div className="product-price">
  {product.sale_price &&
   Number(product.sale_price) > 0 &&
   Number(product.sale_price) < Number(product.price) ? (
    <>
      <span className="original-price">
        ₹{Number(product.price).toLocaleString("en-IN")}
      </span>

      <span className="sale-price">
        ₹{Number(product.sale_price).toLocaleString("en-IN")}
      </span>

      <span className="discount-badge">
        {Math.round(
          (1 - Number(product.sale_price) / Number(product.price)) * 100
        )}% OFF
      </span>
    </>
  ) : (
    <span className="regular-price">
      ₹{Number(product.price).toLocaleString("en-IN")}
    </span>
  )}
</div>
<div className="product-actions">
  <button
    type="button"
    className="add-to-bag-button"
    onClick={() => onAdd(product)}
  >
    ADD TO BAG
  </button>
</div>
      {message && (
        <p className="review-message">{message}</p>
      )}

      {reviewsOpen && (
        <div className="modal-backdrop">
          <section className="noir-modal">
            <button
              className="modal-x"
              onClick={() => setReviewsOpen(false)}
            >
              ×
            </button>

            <p className="eyebrow">NOIR CUSTOMER VOICES</p>
            <h2>{product.name}</h2>

            <h3>
              ★ {Number(summary.average_rating).toFixed(1)} / 5
            </h3>

            <p>{summary.total_reviews} customer reviews</p>

            {reviews.length === 0 ? (
              <p>No reviews yet. Be the first to review this product.</p>
            ) : (
              reviews.map(review => (
                <article className="history-row" key={review.id}>
                  <strong>{review.customer_name}</strong>

                  <span>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </span>

                  <p>{review.review_text}</p>

                  <small>
                    {new Date(review.created_at).toLocaleDateString()}
                  </small>

                  {review.is_mine && (
                    <div className="review-actions">
                      <button onClick={() => editReview(review)}>
                        EDIT
                      </button>

                      <button onClick={() => removeReview(review.id)}>
                        DELETE
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}

            <button
              className="checkout-button"
              onClick={openReviewForm}
              disabled={busy}
            >
              WRITE A REVIEW
            </button>
          </section>
        </div>
      )}

      {writeOpen && (
        <div className="modal-backdrop">
          <form className="noir-modal" onSubmit={saveReview}>
            <button
              type="button"
              className="modal-x"
              onClick={() => {
                setWriteOpen(false);
                setEditingReview(null);
              }}
            >
              ×
            </button>

            <p className="eyebrow">YOUR NOIR EXPERIENCE</p>
            <h2>
              {editingReview ? "Edit your review." : "Write a review."}
            </h2>

            {!editingReview && (
              <label>
                Select purchase
                <select
                  value={selectedOrder}
                  onChange={event => setSelectedOrder(event.target.value)}
                  required
                >
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      Order #{order.id}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Your rating
              <select
                value={rating}
                onChange={event => setRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map(star => (
                  <option key={star} value={star}>
                    {"★".repeat(star)} ({star}/5)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Your review
              <textarea
                value={reviewText}
                onChange={event => setReviewText(event.target.value)}
                minLength="3"
                maxLength="2000"
                required
                placeholder="Share your experience..."
              />
            </label>

            <button className="checkout-button" disabled={busy}>
              {busy ? "PLEASE WAIT..." : "SUBMIT REVIEW"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
