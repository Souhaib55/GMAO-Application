namespace Core.Entities;

public class StockEntities
{
    public int Id { get; set; }
    public string Name { get; set; }
    public ICollection<Stock> Stocks { get; set; }
}