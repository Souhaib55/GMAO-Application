namespace Core.Entities;

public class StockStatus
{
    public int Id { get; set; }
    public string Status { get; set; }
    public ICollection<Stock> Stocks { get; set; }
}