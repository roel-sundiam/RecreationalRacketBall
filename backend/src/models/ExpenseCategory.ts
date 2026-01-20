import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseCategory extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  color?: string;
  icon?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [3, 'Category name must be at least 3 characters'],
      maxlength: [100, 'Category name must not exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    color: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Color must be a valid hex format (#RRGGBB)'
      }
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [50, 'Icon name must not exceed 50 characters']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
ExpenseCategorySchema.index({ name: 1 }, { unique: true });
ExpenseCategorySchema.index({ isActive: 1, displayOrder: 1 });

// Pre-save hook to ensure case-insensitive uniqueness
ExpenseCategorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const ExpenseCategoryModel = this.constructor as any;
    const existingCategory = await ExpenseCategoryModel.findOne({
      name: { $regex: new RegExp(`^${this.name}$`, 'i') },
      _id: { $ne: this._id }
    });

    if (existingCategory) {
      throw new Error('Category name already exists (case-insensitive)');
    }
  }
  next();
});

// Pre-save hook to validate deactivation
ExpenseCategorySchema.pre('save', async function(next) {
  if (this.isModified('isActive') && !this.isActive) {
    try {
      const Expense = mongoose.model('Expense');
      const expenseCount = await Expense.countDocuments({ category: this.name });

      if (expenseCount > 0) {
        throw new Error(`Cannot deactivate category. It is used in ${expenseCount} expense(s)`);
      }
    } catch (error: any) {
      if (error.message.includes('Cannot deactivate')) {
        throw error;
      }
      // If Expense model doesn't exist yet, allow deactivation
    }
  }
  next();
});

const ExpenseCategory = mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);

export default ExpenseCategory;
