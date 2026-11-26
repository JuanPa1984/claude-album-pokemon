Feature: Collecting stickers
  As a logged-in trainer
  I want to mark the stickers I own
  So that I can see how complete each album is

  Background:
    Given I am logged in as "ash"

  Scenario: Browsing the albums anonymously shows no progress
    Given I am not logged in
    When I request the album list
    Then the response status is 200
    And the album "kanto" has 151 stickers and 0 owned

  Scenario: Marking a sticker as owned updates album progress
    When I mark sticker number 25 of album "kanto" as owned
    Then the response status is 200
    And the album "kanto" shows 1 owned sticker
    And sticker number 25 of album "kanto" is owned

  Scenario: Marking the same sticker twice is idempotent
    When I mark sticker number 1 of album "kanto" as owned
    And I mark sticker number 1 of album "kanto" as owned
    Then the album "kanto" shows 1 owned sticker

  Scenario: Removing a sticker from the collection
    Given I own sticker number 4 of album "kanto"
    When I unmark sticker number 4 of album "kanto"
    Then the response status is 200
    And the album "kanto" shows 0 owned stickers

  Scenario: Collecting requires a login
    Given I am not logged in
    When I mark sticker number 1 of album "kanto" as owned
    Then the response status is 401

  Scenario: Unknown album
    When I request the album "atlantis"
    Then the response status is 404
