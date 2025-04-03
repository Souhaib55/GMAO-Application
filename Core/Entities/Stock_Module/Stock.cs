namespace Core.Entities;

public class Stock
{
    public int Id { get; set; }
    public string Code { get; set; }
    public string Description { get; set; }
    public int StockEntitiesId { get; set; }
    public StockEntities? StockEntities { get; set; }
    public int StockStatusId { get; set; }
    public StockStatus? StockStatus { get; set; }
    public int StockSupplierId { get; set; }
    public StockSupplier? StockSupplier { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.Now;
    public bool IsDeleted { get; set; } = false;
}