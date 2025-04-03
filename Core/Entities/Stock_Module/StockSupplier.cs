namespace Core.Entities;

public class StockSupplier
{
    public int Id { get; set; }
    public string SupplierName { get; set; }
    public ICollection<Stock> Stocks { get; set; }
}