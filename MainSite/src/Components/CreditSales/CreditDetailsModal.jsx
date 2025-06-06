import React, { useState } from "react";
import { format } from "date-fns";
import { AlertCircle, X, Edit2, Trash2, Undo, Delete, ArrowLeft } from "lucide-react";
import { addCreditPayment, closeCreditSale, addCreditRefund, updateCreditPayment, deleteCreditPayment, deleteCreditSale, restoreCreditSale, permanentDeleteCreditSale } from "../api.js";
import "./CreditDetailsModal.css";

const CreditDetailsModal = ({ creditSale, onUpdate, onClose, shop = "Shop 1" }) => {
  const [payment, setPayment] = useState({ amount: "", mode: "Cash", note: "" });
  const [refund, setRefund] = useState({ amount: "", note: "" });
  const [editingPayment, setEditingPayment] = useState(null);
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const paymentModes = ["Cash", "UPI", "Card", "Cheque", "Manual"];

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPayment({ ...payment, [name]: value });
  };

  const handleRefundChange = (e) => {
    const { name, value } = e.target;
    setRefund({ ...refund, [name]: value });
  };

  const handleEditPaymentChange = (e) => {
    const { name, value } = e.target;
    setEditingPayment({ ...editingPayment, [name]: value });
  };

  const addPartialPayment = async () => {
    const amount = parseFloat(payment.amount);
    if (!amount || amount <= 0) {
      setWarning("Please enter a valid payment amount");
      return;
    }
    if (amount > creditSale.totalAmount) {
      setWarning("Payment amount cannot exceed remaining balance");
      return;
    }
    setLoading(true);
    try {
      const paymentData = {
        amount,
        mode: payment.mode,
        note: payment.note,
      };
      const updatedSale = await addCreditPayment(shop, creditSale._id, paymentData);
      onUpdate(updatedSale);
      setPayment({ amount: "", mode: "Cash", note: "" });
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const addRefund = async () => {
    const amount = parseFloat(refund.amount);
    if (!amount || amount <= 0) {
      setWarning("Please enter a valid refund amount");
      return;
    }
    if (amount > creditSale.paidAmount) {
      setWarning("Refund amount cannot exceed paid amount");
      return;
    }
    setLoading(true);
    try {
      const refundData = {
        amount,
        note: refund.note || "Customer refund",
        date: format(new Date(), "dd-MM-yyyy"),
      };
      const updatedSale = await addCreditRefund(shop, creditSale._id, refundData);
      onUpdate(updatedSale);
      setRefund({ amount: "", note: "" });
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to process refund");
    } finally {
      setLoading(false);
    }
  };

  const startEditPayment = (payment) => {
    setEditingPayment({
      _id: payment._id,
      amount: payment.amount.toString(),
      mode: payment.mode,
      note: payment.note || "",
    });
  };

  const saveEditPayment = async () => {
    const amount = parseFloat(editingPayment.amount);
    if (!amount || amount < 0) {
      setWarning("Please enter a valid payment amount");
      return;
    }
    setLoading(true);
    try {
      const paymentData = {
        amount,
        mode: editingPayment.mode,
        note: editingPayment.note,
      };
      const updatedSale = await updateCreditPayment(shop, creditSale._id, editingPayment._id, paymentData);
      onUpdate(updatedSale);
      setEditingPayment(null);
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to update payment");
    } finally {
      setLoading(false);
    }
  };

  const cancelEditPayment = () => {
    setEditingPayment(null);
    setWarning("");
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    setLoading(true);
    try {
      const updatedSale = await deleteCreditPayment(shop, creditSale._id, paymentId);
      onUpdate(updatedSale);
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to delete payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBill = async (manualClose = false) => {
    setLoading(true);
    try {
      let paymentData = null;
      if (manualClose) {
        const input = prompt("Enter final settlement amount:");
        const finalAmount = parseFloat(input);
        const note = prompt("Enter any note (e.g., reason for settlement):") || "";
        if (isNaN(finalAmount) || finalAmount < 0) {
          setWarning("Invalid settlement amount");
          setLoading(false);
          return;
        }
        paymentData = { amount: finalAmount, mode: "Manual", note };
      }
      const updatedSale = await closeCreditSale(shop, creditSale._id, "Cleared", paymentData);
      onUpdate(updatedSale);
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to close bill");
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!window.confirm("Are you sure you want to move this credit sale to trash? No data will be lost; it will be moved to Cleared & Trashed Bills for viewing.")) return;
    setLoading(true);
    try {
      const updatedSale = await deleteCreditSale(shop, creditSale._id);
      onUpdate(updatedSale);
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to move to trash");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Are you sure you want to restore this credit sale?")) return;
    setLoading(true);
    try {
      const updatedSale = await restoreCreditSale(shop, creditSale._id);
      onUpdate(updatedSale);
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to restore credit sale");
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this credit sale? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await permanentDeleteCreditSale(shop, creditSale._id);
      onClose();
      setWarning("");
    } catch (error) {
      setWarning(error.message || "Failed to permanently delete credit sale");
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = creditSale.paidAmount || 0;
  const remainingBalance = creditSale.totalAmount || 0;
  const originalBillAmount = totalPaid + remainingBalance;

  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return "N/A";
    }
    return format(new Date(date), "dd-MM-yyyy");
  };

  return (
    <div className="modal-overlay-dax">
      <div className="modal-content-dax">
        <div className="modal-header-dax">
          <h2>Credit Details: {creditSale.customerName}</h2>
          <button className="close-btn-dax" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>
        {creditSale.isDeleted && (
          <div className="warning-message-dax">
            <AlertCircle size={16} />
            <span>This credit sale is deleted</span>
          </div>
        )}
        <div className="credit-details-dax">
          <div className="detail-row-dax">
            <span>Bill Number:</span>
            <span>{creditSale.billNumber}</span>
          </div>
          <div className="detail-row-dax">
            <span>Phone:</span>
            <span>{creditSale.phoneNumber}</span>
          </div>
          <div className="detail-row-dax">
            <span>Original Bill Amount:</span>
            <span>₹{originalBillAmount.toFixed(2)}</span>
          </div>
          <div className="detail-row-dax">
            <span>Paid Amount:</span>
            <span>₹{totalPaid.toFixed(2)}</span>
          </div>
          <div className="detail-row-dax">
            <span>Remaining Balance:</span>
            <span>₹{remainingBalance.toFixed(2)}</span>
          </div>
          <div className="detail-row-dax">
            <span>Status:</span>
            <span className={creditSale.status === "Cleared" ? "status-cleared-dax" : "status-open-dax"}>
              {creditSale.status}
            </span>
          </div>
        </div>

        <h3>Items Taken</h3>
        <table className="items-table-dax">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Price per Unit (₹)</th>
              <th>Total (₹)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {creditSale.items.map((item, index) => (
              <tr key={index}>
                <td>{item.product}</td>
                <td>{item.qty}</td>
                <td>{item.unit}</td>
                <td>₹{item.pricePerUnit.toFixed(2)}</td>
                <td>₹{item.amount.toFixed(2)}</td>
                <td>{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Payment History</h3>
        {creditSale.paymentHistory && creditSale.paymentHistory.length > 0 ? (
          <table className="payment-history-table-dax">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount (₹)</th>
                <th>Mode</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {creditSale.paymentHistory.map((payment, index) => (
                <tr key={index}>
                  <td>{payment.date}</td>
                  <td>₹{payment.amount.toFixed(2)}</td>
                  <td>{payment.mode}</td>
                  <td>{payment.note || "-"}</td>
                  <td>
                    <div className="action-buttons-dax">
                      <button
                        className="edit-btn-dax"
                        onClick={() => startEditPayment(payment)}
                        disabled={loading || creditSale.isDeleted}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="delete-btn-dax"
                        onClick={() => deletePayment(payment._id)}
                        disabled={loading || creditSale.isDeleted}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No payments recorded yet.</p>
        )}

        {editingPayment && (
          <div className="edit-payment-section-dax">
            <h3>Edit Payment</h3>
            <div className="payment-form-dax">
              <div className="form-group-dax">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={editingPayment.amount}
                  onChange={handleEditPaymentChange}
                  placeholder="Enter payment amount"
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
              </div>
              <div className="form-group-dax">
                <label>Payment Mode</label>
                <select
                  name="mode"
                  value={editingPayment.mode}
                  onChange={handleEditPaymentChange}
                  disabled={loading}
                >
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group-dax">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  value={editingPayment.note}
                  onChange={handleEditPaymentChange}
                  placeholder="Optional note"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-buttons-dax">
              <button
                className="submit-btn-dax"
                onClick={saveEditPayment}
                disabled={loading}
              >
                Save
              </button>
              <button
                className="cancel-btn-dax"
                onClick={cancelEditPayment}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!creditSale.isDeleted && creditSale.status !== "Cleared" && (
          <div className="payment-section-dax">
            <h3>Add Partial Payment</h3>
            <div className="payment-form-dax">
              <div className="form-group-dax">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={payment.amount}
                  onChange={handlePaymentChange}
                  placeholder="Enter payment amount"
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
              </div>
              <div className="form-group-dax">
                <label>Payment Mode</label>
                <select
                  name="mode"
                  value={payment.mode}
                  onChange={handlePaymentChange}
                  disabled={loading}
                >
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group-dax">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  value={payment.note}
                  onChange={handlePaymentChange}
                  placeholder="Optional note"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-buttons-dax">
              <button
                className="submit-btn-dax"
                onClick={addPartialPayment}
                disabled={loading}
              >
                {loading ? "Processing..." : "Add Payment"}
              </button>
            </div>

            <h3>Add Refund</h3>
            <div className="payment-form-dax">
              <div className="form-group-dax">
                <label>Refund Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={refund.amount}
                  onChange={handleRefundChange}
                  placeholder="Enter refund amount"
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
              </div>
              <div className="form-group-dax">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  value={refund.note}
                  onChange={handleRefundChange}
                  placeholder="Optional note"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-buttons-dax">
              <button
                className="submit-btn-dax"
                onClick={addRefund}
                disabled={loading || creditSale.paidAmount <= 0}
              >
                {loading ? "Processing..." : "Add Refund"}
              </button>
            </div>

            <h3>Close Bill</h3>
            <div className="form-buttons-dax">
              <button
                className="submit-btn-dax"
                onClick={() => handleCloseBill(false)}
                disabled={loading}
              >
                Close Bill (Full Payment)
              </button>
              <button
                className="manual-close-btn-dax"
                onClick={() => handleCloseBill(true)}
                disabled={loading}
              >
                Manual Close
              </button>
            </div>
          </div>
        )}

        <div className="delete-section-dax">
          <h3>Manage Credit Sale</h3>
          <p className="trash-note-dax">
            Moving to trash does not delete data; it relocates cleared bills to "Cleared & Trashed Bills" to keep your main dashboard clean.
          </p>
          <div className="form-buttons-dax">
            {!creditSale.isDeleted && (
              <>
                {creditSale.status === "Cleared" && (
                  <button
                    className="move-to-trash-btn-dax"
                    onClick={handleSoftDelete}
                    disabled={loading}
                  >
                    <Trash2 size={16} /> Move to Trash
                  </button>
                )}
                <button
                  className="delete-btn-dax"
                  onClick={handleSoftDelete}
                  disabled={loading}
                >
                  <Trash2 size={16} /> Soft Delete
                </button>
                <button
                  className="permanent-delete-btn-dax"
                  onClick={handlePermanentDelete}
                  disabled={loading}
                >
                  <ArrowLeft size={16} /> <Delete size={16} /> Permanent Delete
                </button>
              </>
            )}
            {creditSale.isDeleted && (
              <>
                <button
                  className="submit-btn-dax"
                  onClick={handleRestore}
                  disabled={loading}
                >
                  <Undo size={16} /> Restore
                </button>
                <button
                  className="delete-btn-dax"
                  onClick={handlePermanentDelete}
                  disabled={loading}
                >
                  <Delete size={16} /> Permanent Delete
                </button>
              </>
            )}
          </div>
        </div>

        {warning && (
          <div className="warning-message-dax">
            <AlertCircle size={16} />
            <span>{warning}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditDetailsModal;