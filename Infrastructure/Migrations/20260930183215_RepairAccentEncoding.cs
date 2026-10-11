using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// Repairs French text that was inserted with the wrong encoding
    /// (UTF-8 bytes read as Windows-1252: "préventive" stored as "prÃ©ventive").
    ///
    /// Every nvarchar column of the business tables is scanned and the known
    /// mojibake sequences are replaced by the intended character. Characters are
    /// written as NCHAR codes so this script is immune to file encoding, and the
    /// comparison is binary so correct text is never touched. Running it on a
    /// clean database changes nothing.
    /// </summary>
    public partial class RepairAccentEncoding : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DECLARE @pairs TABLE (seq int IDENTITY(1,1), bad nvarchar(10), good nvarchar(2));

-- Three-character sequences first (right single quote)
INSERT INTO @pairs (bad, good) VALUES (NCHAR(226) + NCHAR(8364) + NCHAR(8482), NCHAR(8217));

-- Lower case letters
INSERT INTO @pairs (bad, good) VALUES
 (NCHAR(195) + NCHAR(169), NCHAR(233)),  -- é
 (NCHAR(195) + NCHAR(168), NCHAR(232)),  -- è
 (NCHAR(195) + NCHAR(170), NCHAR(234)),  -- ê
 (NCHAR(195) + NCHAR(171), NCHAR(235)),  -- ë
 (NCHAR(195) + NCHAR(160), NCHAR(224)),  -- à
 (NCHAR(195) + NCHAR(162), NCHAR(226)),  -- â
 (NCHAR(195) + NCHAR(164), NCHAR(228)),  -- ä
 (NCHAR(195) + NCHAR(174), NCHAR(238)),  -- î
 (NCHAR(195) + NCHAR(175), NCHAR(239)),  -- ï
 (NCHAR(195) + NCHAR(180), NCHAR(244)),  -- ô
 (NCHAR(195) + NCHAR(182), NCHAR(246)),  -- ö
 (NCHAR(195) + NCHAR(185), NCHAR(249)),  -- ù
 (NCHAR(195) + NCHAR(187), NCHAR(251)),  -- û
 (NCHAR(195) + NCHAR(188), NCHAR(252)),  -- ü
 (NCHAR(195) + NCHAR(167), NCHAR(231)),  -- ç
 (NCHAR(197) + NCHAR(8220), NCHAR(339)); -- œ

-- Upper case letters (second byte mapped through Windows-1252)
INSERT INTO @pairs (bad, good) VALUES
 (NCHAR(195) + NCHAR(8240), NCHAR(201)), -- É
 (NCHAR(195) + NCHAR(710),  NCHAR(200)), -- È
 (NCHAR(195) + NCHAR(352),  NCHAR(202)), -- Ê
 (NCHAR(195) + NCHAR(8364), NCHAR(192)), -- À
 (NCHAR(195) + NCHAR(8225), NCHAR(199)), -- Ç
 (NCHAR(195) + NCHAR(8221), NCHAR(212)), -- Ô
 (NCHAR(195) + NCHAR(381),  NCHAR(206)); -- Î

-- Punctuation built on 0xC2
INSERT INTO @pairs (bad, good) VALUES
 (NCHAR(194) + NCHAR(171), NCHAR(171)),  -- «
 (NCHAR(194) + NCHAR(187), NCHAR(187)),  -- »
 (NCHAR(194) + NCHAR(176), NCHAR(176)),  -- °
 (NCHAR(194) + NCHAR(160), NCHAR(160));  -- non-breaking space

DECLARE @table sysname, @column sysname, @sql nvarchar(max);
DECLARE columns_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT c.TABLE_NAME, c.COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS c
    JOIN INFORMATION_SCHEMA.TABLES t ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
    WHERE c.DATA_TYPE = 'nvarchar'
      AND c.TABLE_NAME NOT LIKE 'AspNet%'
      AND c.TABLE_NAME <> '__EFMigrationsHistory';

OPEN columns_cursor;
FETCH NEXT FROM columns_cursor INTO @table, @column;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'
DECLARE @bad nvarchar(10), @good nvarchar(2);
DECLARE p CURSOR LOCAL FAST_FORWARD FOR SELECT bad, good FROM #pairs ORDER BY seq;
OPEN p; FETCH NEXT FROM p INTO @bad, @good;
WHILE @@FETCH_STATUS = 0
BEGIN
    UPDATE ' + QUOTENAME(@table) + N'
       SET ' + QUOTENAME(@column) + N' = REPLACE(' + QUOTENAME(@column) + N' COLLATE Latin1_General_BIN2, @bad, @good)
     WHERE CHARINDEX(@bad COLLATE Latin1_General_BIN2, ' + QUOTENAME(@column) + N' COLLATE Latin1_General_BIN2) > 0;
    FETCH NEXT FROM p INTO @bad, @good;
END
CLOSE p; DEALLOCATE p;';

    IF OBJECT_ID('tempdb..#pairs') IS NULL
        SELECT seq, bad, good INTO #pairs FROM @pairs;

    EXEC sp_executesql @sql;
    FETCH NEXT FROM columns_cursor INTO @table, @column;
END
CLOSE columns_cursor;
DEALLOCATE columns_cursor;

IF OBJECT_ID('tempdb..#pairs') IS NOT NULL DROP TABLE #pairs;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data repair: there is nothing meaningful to undo.
        }
    }
}
