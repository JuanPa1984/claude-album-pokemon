Feature: Browsing sticker albums
  As a visitor
  I want to see the available albums
  So that I can decide which one to collect

  Scenario: A visitor sees the album catalogue
    Given I am on the home page
    Then I see the heading "Sticker albums"
    And I see the album "Kanto Collection"
    And I see the album "Johto Collection"

  Scenario: A visitor cannot mark stickers
    Given I am on the album page "kanto"
    Then the sticker "Pikachu" cannot be clicked
