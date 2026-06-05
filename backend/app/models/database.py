from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "Tenant"
    id = Column(String, primary_key=True)
    clerkOrgId = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="tenant")
    orders = relationship("Order", back_populates="tenant")
    complaints = relationship("Complaint", back_populates="tenant")
    chat_messages = relationship("ChatMessage", back_populates="tenant")
    faqs = relationship("FAQ", back_populates="tenant")

class Product(Base):
    __tablename__ = "Product"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    imageUrl = Column(String, nullable=False)
    details = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    tenantId = Column(String, ForeignKey("Tenant.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "Order"
    id = Column(String, primary_key=True)
    userId = Column(String, nullable=True)
    total = Column(Float, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    paymentMethod = Column(String, nullable=True)
    shippingAddress = Column(String, nullable=True)
    shippingCity = Column(String, nullable=True)
    shippingCountry = Column(String, nullable=True)
    shippingState = Column(String, nullable=True)
    shippingZip = Column(String, nullable=True)
    customerEmail = Column(String, nullable=True)
    customerName = Column(String, nullable=True)
    trackingNumber = Column(String, nullable=True)
    carrier = Column(String, default="UPS", nullable=True)
    tenantId = Column(String, ForeignKey("Tenant.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "OrderItem"
    id = Column(String, primary_key=True)
    orderId = Column(String, ForeignKey("Order.id"), nullable=False)
    productId = Column(String, ForeignKey("Product.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class ChatMessage(Base):
    __tablename__ = "ChatMessage"
    id = Column(String, primary_key=True)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    userName = Column(String, nullable=True)
    userId = Column(String, nullable=True)
    promptTokens = Column(Integer, nullable=True)
    completionTokens = Column(Integer, nullable=True)
    totalTokens = Column(Integer, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    tenantId = Column(String, ForeignKey("Tenant.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="chat_messages")

class Complaint(Base):
    __tablename__ = "Complaint"
    id = Column(String, primary_key=True)
    userId = Column(String, nullable=True)
    customerName = Column(String, nullable=True)
    customerEmail = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="OPEN", nullable=False)
    priority = Column(String, default="MEDIUM", nullable=False)
    tags = Column(ARRAY(String), default=[], nullable=False)
    assignedTo = Column(String, nullable=True)
    chatSessionId = Column(String, nullable=True)
    internalNotes = Column(String, nullable=True)
    resolvedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    tenantId = Column(String, ForeignKey("Tenant.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="complaints")

class FAQ(Base):
    __tablename__ = "FAQ"
    id = Column(String, primary_key=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    tenantId = Column(String, ForeignKey("Tenant.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="faqs")
